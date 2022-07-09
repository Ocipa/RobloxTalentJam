import { RobotModel } from "./interfaces"


const workspace = game.GetService("Workspace")
const replicatedStorage = game.GetService("ReplicatedStorage")


export class Robot {
    owner: Player
    model: RobotModel

    constructor(owner: Player) {
        this.owner = owner
        this.model = this.CreateModel()

        this.Spawn()

        print("%s added a robot".format(owner.Name))
    }

    private CreateModel(): RobotModel {
        const robotModel = replicatedStorage.FindFirstChild("robotModel") as RobotModel

        const model = robotModel.Clone()
        model.Parent = workspace

        return model
    }

    Spawn(): void {
        if (this.owner.Character) {
            this.model.PivotTo(this.owner.Character.GetPivot())
        }
    }
}