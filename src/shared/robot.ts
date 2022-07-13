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
    WaypointSpacing: 4.5,
    Costs: {
        Door: 0.1
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

        this.Spawn(position)

        this.model.Humanoid.MoveToFinished.Connect((reached) => {
            if (runService.IsServer()) {
                const robotService = Dependency<RobotService>()

                robotService.FinishedMoveTo(this)
            }
        })

        print("%s added a robot".format(tostring(owner?.Name)))
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

    Spawn(position?: Vector3): void {
        if (position) {
            this.model.PivotTo(new CFrame(position))

        } else if (this.owner && this.owner.Character) {
            this.model.PivotTo(this.owner.Character.GetPivot())

        } else {
            this.model.PivotTo(new CFrame(Vector3.zero))
        }
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
            this.moving = true

            while (this.CheckForCollisions()) {
                if (this.nextMove !== promise) {
                    return
                }

                task.wait()
            }

            this.currentWaypoint ++
            if (!this.waypoints[this.currentWaypoint]) {return}

            const humanoid = this.model.Humanoid
            humanoid.MoveTo(this.waypoints[this.currentWaypoint].Position)

            this.CheckForJump()

            this.nextMove = undefined
            resolve()
        })

        return promise
    }

    CheckForCollisions(): boolean {
        if (!this.waypoints[this.currentWaypoint]) {return false}
        if (!this.waypoints[this.currentWaypoint + 1]) {return false}

        const p1 = this.waypoints[this.currentWaypoint].Position
        const p2 = this.waypoints[this.currentWaypoint + 1].Position

        const dis = p2.sub(p1).Magnitude
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
            this.currentWaypoint = 0

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
}