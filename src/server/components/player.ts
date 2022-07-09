import { BaseComponent, Component } from "@flamework/components";
import { OnStart } from "@flamework/core";





@Component({
    tag: "player"
})
export class Ply extends BaseComponent<{}, Player> implements OnStart {
    constructor() {
        super()
    }

    onStart(): void {
        print("%s joined the game".format(this.instance.Name))
    }
}