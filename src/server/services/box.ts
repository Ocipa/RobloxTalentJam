import { Service } from "@flamework/core";
import { BoxPile } from "shared/boxPile";
import { Pile } from "shared/interfaces";


const workspace = game.GetService("Workspace")


@Service()
export class BoxService {
    piles: Array<BoxPile>

    constructor() {
        this.piles = []

        const boxPiles = workspace.FindFirstChild("boxPiles") as Folder

        const pile1 = this.AddPile(boxPiles.FindFirstChild("Pile1") as Pile, 41)
        const pile2 = this.AddPile(boxPiles.FindFirstChild("Pile2") as Pile, 0)

        pile1.AssignTarget(pile2)
        pile2.AssignTarget(pile1)
    }

    AddPile(pile: Pile, boxes: number): BoxPile {
        const boxPile = new BoxPile(pile, boxes)

        this.piles.push(boxPile)
        return boxPile
    }
}