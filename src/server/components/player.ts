import { BaseComponent, Component } from "@flamework/components";
import { Dependency, OnStart, OnTick } from "@flamework/core";
import { RobotService } from "server/services/robot";
import { Robot } from "shared/robot";


const workspace = game.GetService("Workspace")



@Component({
    tag: "player"
})
export class Ply extends BaseComponent<{}, Player> implements OnStart, OnTick {
    robotSpots: Array<Vector3>

    constructor() {
        super()

        this.robotSpots = []
    }

    onStart(): void {
        const robotService = Dependency<RobotService>()

        this.instance.CharacterAdded.Connect((character) => {
            this.instance.CharacterAppearanceLoaded.Wait()

            task.wait()

            const robots: Array<Robot> = robotService.GetRobotsOwnedByPlayer(this.instance)

            for (const robot of robots) {
                robot.Spawn()
            }
        })

        print("%s joined the game".format(this.instance.Name))
    }

    onTick(dt: number): void {
        
    }
}