import { Dependency } from "@flamework/core"
import { RobotModel } from "./interfaces"
import { RobotService } from "server/services/robot";


const workspace = game.GetService("Workspace")
const replicatedStorage = game.GetService("ReplicatedStorage")
const pathfindingService = game.GetService("PathfindingService")
const runService = game.GetService("RunService")

const agentParams: AgentParameters = {
    AgentRadius: 2,
    AgentHeight: 6.5,
    AgentCanJump: true,
    WaypointSpacing: 4,
    Costs: {

    }
}

export class Robot {
    owner?: Player
    model: RobotModel

    currentWaypoint: number
    waypoints: Array<PathWaypoint>

    action: "following" | "attacking"
    moving: boolean

    debugParts: {
        pathJoints: Array<Part>
        pathConnections: Array<Part>
    }

    constructor(owner?: Player, position?: Vector3) {
        this.owner = owner
        this.model = this.CreateModel()

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
        model.Parent = workspace
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

    MoveToNextWaypoint(): void {
        this.currentWaypoint ++

        if (!this.waypoints[this.currentWaypoint]) {return}

        this.moving = true

        const humanoid = this.model.Humanoid
        humanoid.MoveTo(this.waypoints[this.currentWaypoint].Position)

        if (this.waypoints[this.currentWaypoint].Action === Enum.PathWaypointAction.Jump) {
            humanoid.Jump = true
        }
    }

    ComputePath(target: Vector3): Promise<Path> {
        return new Promise<Path>((resolve) => {
            let start = this.GetPosition()
            if (this.waypoints[this.currentWaypoint]) {
                start = this.waypoints[this.currentWaypoint].Position
            }
        
            const path = pathfindingService.CreatePath(agentParams)
            path.ComputeAsync(start, target)

            this.waypoints = path.GetWaypoints()
            this.currentWaypoint = 0

            this.RenderDebugPath(path)
            
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