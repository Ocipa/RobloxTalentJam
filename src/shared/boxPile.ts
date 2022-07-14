import { Dependency } from "@flamework/core"
import { RobotService } from "server/services/robot"
import { Pile } from "./interfaces"


const replicatedStorage = game.GetService("ReplicatedStorage")


export class BoxPile {
    model: Pile
    boxes: Array<MeshPart>

    target?: BoxPile

    constructor(pile: Pile, boxes: number) {
        this.model = pile
        this.boxes = []

        for (let i = 0; i < boxes; i++) {
            this.PlaceBox()
        }

        this.model.ClickDetector.MouseClick.Connect((player: Player) => {
            if (this.boxes.size() > 0) {
                const robotService = Dependency<RobotService>()
                robotService.AssignRobot("pickupBoxes", this, player)
            }
        })
    }

    TakeBox(): boolean {
        const index = this.boxes.size()

        if (index > 0) {
            this.boxes[index - 1].Destroy()
            this.boxes.remove(index - 1)

            return true
        }

        return false
    }

    PlaceBox(): void {
        const index = this.boxes.size()

        const boxModel = replicatedStorage.FindFirstChild("box") as MeshPart
        const box = boxModel.Clone()

        const attachment = this.model.Part.FindFirstChild(index + 1) as Attachment
        const cframe = attachment.WorldCFrame

        box.CFrame = cframe
        box.Name = tostring(index + 1)
        box.Parent = this.model.boxes

        this.boxes[index] = box
    }

    AssignTarget(targetPile: BoxPile): void {
        this.target = targetPile
    }
}