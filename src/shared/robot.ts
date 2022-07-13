import { Dependency, OnTick } from "@flamework/core"
import { RobotModel } from "./interfaces"
import { RobotService } from "server/services/robot";


const workspace = game.GetService("Workspace")
const replicatedStorage = game.GetService("ReplicatedStorage")
const pathfindingService = game.GetService("PathfindingService")
const runService = game.GetService("RunService")

const agentParams: AgentParameters = {
    AgentRadius: 1.6,
    AgentHeight: 6.5,
    AgentCanJump: true,
    WaypointSpacing: 3,
    Costs: {
        Door: 0.1,
        Lava: math.huge
    }
}

export class Robot {
    owner?: Player
    model: RobotModel

    target?: Vector3
    lastPosition: Vector3
    stuckLastTick: boolean

    currentWaypoint: number
    waypoints: Array<PathWaypoint>

    action: "following" | "attacking"
    moving: boolean
    nextMove?: Promise<void>

    debugParts: {
        pathJoints: Array<Part>
        pathConnections: Array<Part>
    }

    timestamp: number

    constructor(owner?: Player, position?: Vector3) {
        this.owner = owner
        this.model = this.CreateModel()

        this.lastPosition = Vector3.zero
        this.stuckLastTick = false

        this.currentWaypoint = 0
        this.waypoints = []

        this.action = "following"
        this.moving = false

        this.debugParts = {
            pathJoints: [],
            pathConnections: []
        }

        this.timestamp = tick()

        this.Spawn(position).andThen(() => {
            this.model.Humanoid.MoveToFinished.Connect((reached) => {
                if (runService.IsServer()) {
                    const robotService = Dependency<RobotService>()
    
                    robotService.FinishedMoveTo(this)
                }
            })
        })
    }

    private CreateModel(): RobotModel {
        const robotModel = replicatedStorage.FindFirstChild("robotModel") as RobotModel

        const model = robotModel.Clone()
        model.Parent = workspace.FindFirstChild("robots") || workspace
        model.PrimaryPart.SetNetworkOwner(undefined)

        return model
    }

    private GetPosition(): Vector3 {
        return this.model.GetPivot().Position
    }

    Spawn(position?: Vector3): Promise<void> {
        return new Promise((resolve) => {
            while (!this.owner || !this.owner.Character) {
                task.wait()
            }

            if (!position) {
                position = this.owner.Character.GetPivot().Position
            }

            const random = new Random()
            const dir = random.NextUnitVector().mul(new Vector3(1, 0, 1))

            let p1 = position.add(dir.mul(agentParams.AgentRadius as number * 2))
            let p2 = p1.add(dir.mul(agentParams.AgentRadius as number * 2))

            while (this.CheckForCollisions(p1, p2)) {
                p1 = p2
                p2 = p1.add(dir.mul(agentParams.AgentRadius as number * 2))
            }

            this.model.PivotTo(new CFrame(p1.Lerp(p2, 0.5)))

            this.waypoints = []
            this.currentWaypoint = 0
            this.model.Humanoid.MoveTo(new CFrame(p1.Lerp(p2, 0.5)).Position)

            this.ComputePath(undefined, true)
            this.MoveToNextWaypoint()

            resolve()
        })
    }

    Jump(): void {
        const humanoid = this.model.Humanoid
        const humanoidState = humanoid.GetState()

        let validState = false

        switch (humanoidState) {
            case Enum.HumanoidStateType.Running:
                validState = true
                break

            case Enum.HumanoidStateType.RunningNoPhysics:
                validState = true
                break
        }

        if (validState) {
            humanoid.Jump = true
        }
    }

    MoveToNextWaypoint(): Promise<void> {
        if (this.nextMove) {
            this.nextMove.cancel()
        }

        const promise: Promise<void> = new Promise((resolve) => {
            this.nextMove = promise

            if (!this.waypoints[this.currentWaypoint]) {return false}
            if (!this.waypoints[this.currentWaypoint + 1]) {return false}

            const p1 = this.waypoints[this.currentWaypoint].Position
            const p2 = this.waypoints[this.currentWaypoint + 1].Position

            while (this.CheckForCollisions(p1, p2)) {
                if (this.nextMove !== promise) {
                    return
                }

                task.wait()
            }

            this.moving = true

            this.currentWaypoint ++
            if (!this.waypoints[this.currentWaypoint]) {return}

            const humanoid = this.model.FindFirstChildOfClass("Humanoid")
            if (humanoid) {
                humanoid.MoveTo(this.waypoints[this.currentWaypoint].Position)

                this.CheckForJump()

                this.nextMove = undefined
            }

            resolve()
        })

        return promise
    }

    CheckForCollisions(p1: Vector3, p2: Vector3): boolean {
        const dis = math.clamp(p2.sub(p1).Magnitude * 3, 2, 10)
        const center = p1.add(p2.sub(p1).div(2))

        const part = new Instance("Part")
        part.Size = new Vector3(agentParams.AgentHeight, dis, dis)
        part.Position = center.add(new Vector3(0, agentParams.AgentHeight as number / 2, 0))
        part.Orientation = new Vector3(0, 0, -90)
        part.Shape = Enum.PartType.Cylinder
        part.Anchored = true
        part.CanCollide = true
        part.Parent = workspace

        const touching = part.GetTouchingParts()

        part.Destroy()

        for (const p of touching) {
            const robotsFolder = workspace.FindFirstChild("robots") as Folder
            const charactersFolder = workspace.FindFirstChild("characters") as Folder

            if ((p.IsDescendantOf(robotsFolder) || p.IsDescendantOf(charactersFolder)) && !p.IsDescendantOf(this.model)) {
                return true
            }
        }

        return false
    }

    CheckForJump(): void {
        if (this.waypoints[this.currentWaypoint].Action === Enum.PathWaypointAction.Jump) {
            this.Jump()

            return
        }

        if (!this.waypoints[this.currentWaypoint + 1]) {return}

        const rayInfo = new RaycastParams()
        rayInfo.FilterType = Enum.RaycastFilterType.Whitelist
        rayInfo.IgnoreWater = true
        rayInfo.FilterDescendantsInstances = [
            workspace.FindFirstChild("Map") as Model,
            workspace.Terrain
        ]

        const target = this.waypoints[this.currentWaypoint + 1].Position.add(new Vector3(0, 3, 0))

        const origin = CFrame.lookAt(
            this.model.PrimaryPart.Position,
            target
        )
        const dis = origin.Position.sub(target).Magnitude

        const result = workspace.Raycast(origin.Position, origin.LookVector.mul(dis - 1), rayInfo)

        if (result && result.Instance) {
            const modifier = result.Instance.FindFirstChildOfClass("PathfindingModifier")
            if ((!modifier && result.Instance.CanCollide) || (modifier && !modifier.PassThrough)) {
                this.Jump()
            }
        }
    }

    ComputePath(target?: Vector3, force?: boolean): Promise<Path> {
        return new Promise<Path>((resolve) => {
            let start = this.GetPosition()
            if (!force && this.waypoints[this.currentWaypoint]) {
                start = this.waypoints[this.currentWaypoint].Position
            }

            if (target) {
                this.target = target
            }
            if (!this.target) {return}
        
            const path = pathfindingService.CreatePath(agentParams)
            path.ComputeAsync(start, this.target)

            this.waypoints = path.GetWaypoints()
            this.currentWaypoint = 1

            // this.RenderDebugPath(path)
            
            resolve(path)
        })
    }

    private RenderDebugPath(path: Path): void {
        const waypoints = path.GetWaypoints()
        const debugFolder = (workspace.FindFirstChild("debug") || workspace) as Folder

        let i
        for (i=0; i < waypoints.size() - 1; i++) {
            let pointPart = this.debugParts.pathJoints[i]
            if (!pointPart) {
                pointPart = new Instance("Part")
                pointPart.Size = Vector3.one
                pointPart.CanCollide = false
                pointPart.Anchored = true
                pointPart.Shape = Enum.PartType.Ball
                pointPart.TopSurface = Enum.SurfaceType.Smooth
                pointPart.BottomSurface = Enum.SurfaceType.Smooth
                pointPart.Color = Color3.fromRGB(225, 100, 75)

                this.debugParts.pathJoints.push(pointPart)
            }
            pointPart.Position = waypoints[i].Position
            pointPart.Name = tostring(i)
            pointPart.Parent = debugFolder


            let pathPart = this.debugParts.pathConnections[i]
            if (!pathPart) {
                pathPart = new Instance("Part")
                pathPart.CanCollide = false
                pathPart.Anchored = true
                pathPart.TopSurface = Enum.SurfaceType.Smooth
                pathPart.BottomSurface = Enum.SurfaceType.Smooth

                this.debugParts.pathConnections.push(pathPart)
            }
            pathPart.Size = new Vector3(0.25, 0.25, waypoints[i].Position.sub(waypoints[i + 1].Position).Magnitude)
            pathPart.CFrame = CFrame.lookAt(
                waypoints[i].Position.sub(waypoints[i].Position.sub(waypoints[i + 1].Position).div(2)),
                waypoints[i + 1].Position
            )
            pathPart.Name = tostring(i)
            pathPart.Parent = debugFolder

            let pathColor = Color3.fromRGB(75, 225, 100)
            if (waypoints[i + 1].Action === Enum.PathWaypointAction.Jump) {
                pathColor = Color3.fromRGB(75, 100, 225)
            }
            pathPart.Color = pathColor
        }

        for (let k=i; k < this.debugParts.pathJoints.size(); k++) {
            this.debugParts.pathJoints[k].Parent = undefined
        }

        for (let k=i; k < this.debugParts.pathConnections.size(); k++) {
            this.debugParts.pathConnections[k].Parent = undefined
        }
    }

    Destroy(): void {
        this.model.Destroy()
    }
}