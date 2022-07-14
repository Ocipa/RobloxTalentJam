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

    lastPosition: Vector3

    constructor() {
        super()

        this.robotSpots = []
        this.lastPosition = Vector3.zero
    }

    UpdateFollowing(): void {
        const character = this.instance.Character
        if (!character) {return}

        const humanoid = character.FindFirstChild("Humanoid") as Humanoid
        if (!humanoid || humanoid.Health <= 0) {return}

        // const position = character.GetPivot().ToWorldSpace(new CFrame(new Vector3(0, 0, 3))).Position
        const position = character.GetPivot().Position

        const isNear = this.lastPosition.FuzzyEq(position, 0.025)

        if (!isNear) {
            this.lastPosition = position

            const robotService = Dependency<RobotService>()
            const following = robotService.GetFollowingRobots(this.instance)
        
            for (const robot of following) {
                robot.ComputePath().andThen(() => {
                    if (robot.moving === false) {
                        robot.MoveToNextWaypoint()
                    }
                })
            }
        }
    }

    onStart(): void {
        const robotService = Dependency<RobotService>()

        this.instance.CharacterAdded.Connect((character) => {
            this.instance.CharacterAppearanceLoaded.Wait()

            task.wait()

            if (this.instance.Character) {
                this.instance.Character.Parent = workspace.FindFirstChild("characters") as Folder
            }

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