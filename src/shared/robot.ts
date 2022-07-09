import { Dependency } from "@flamework/core"
import { RobotModel } from "./interfaces"
import { RobotService } from "server/services/robot";


const workspace = game.GetService("Workspace")
const replicatedStorage = game.GetService("ReplicatedStorage")
const pathfindingService = game.GetService("PathfindingService")
const runService = game.GetService("RunService")

const agentParams: AgentParameters = {
    AgentRadius: 1.75,
    AgentHeight: 7,
    AgentCanJump: true,
    WaypointSpacing: 4,
    Costs: {

    }
}

export class Robot {
    owner?: Player
    model: RobotModel

    constructor(owner?: Player, position?: Vector3) {
        this.owner = owner
        this.model = this.CreateModel()

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

    ComputePath(target: Vector3): Path {
        const start = this.GetPosition()
        
        const path = pathfindingService.CreatePath(agentParams)
        path.ComputeAsync(start, target)
        return path
    }
}