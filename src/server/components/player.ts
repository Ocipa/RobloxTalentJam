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

    UpdateFollowing(): void {
        const character = this.instance.Character
        if (!character) {return}

        const humanoid = character.FindFirstChild("Humanoid") as Humanoid
        if (!humanoid || humanoid.Health <= 0) {return}

        const position = character.GetPivot().ToWorldSpace(new CFrame(new Vector3(0, 0, -3))).Position

        const enemyService = Dependency<RobotService>()
        const following = enemyService.GetFollowingRobots(this.instance)
        
        for (const robot of following) {
            robot.ComputePath(position)
            
            if (robot.moving === false) {
                robot.MoveToNextWaypoint()
            }
        }
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

    count = 0
    onTick(dt: number): void {
        this.count += dt

        if (this.count < .4) {return}
        this.count = 0

        this.UpdateFollowing()
    }
}