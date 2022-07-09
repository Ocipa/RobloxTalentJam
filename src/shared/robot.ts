import { Dependency } from "@flamework/core"
import { RobotModel } from "./interfaces"
import { RobotService } from "server/services/robot";


const workspace = game.GetService("Workspace")
const replicatedStorage = game.GetService("ReplicatedStorage")
const pathfindingService = game.GetService("PathfindingService")
const runService = game.GetService("RunService")

const agentParams: AgentParameters = {
    AgentRadius: 1.8,
    AgentHeight: 4,
    AgentCanJump: true,
    WaypointSpacing: 3.6,
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

    constructor(owner?: Player, position?: Vector3) {
        this.owner = owner
        this.model = this.CreateModel()

        this.currentWaypoint = 0
        this.waypoints = []

        this.action = "following"
        this.moving = false

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

    ComputePath(target: Vector3): Path {
        const start = this.GetPosition()
        
        const path = pathfindingService.CreatePath(agentParams)
        path.ComputeAsync(start, target)

        this.waypoints = path.GetWaypoints()
        this.currentWaypoint = 0
        return path
    }
}