import { OnStart, Service } from "@flamework/core";
import { Robot } from "shared/robot";
import { events } from "./networking";


const replicatedStorage = game.GetService("ReplicatedStorage")

@Service()
export class RobotService implements OnStart {
    robots: Array<Robot>

    constructor() {
        this.robots = []
    }

    AddRobot(owner: Player): void {
        const robot = new Robot(owner)
        this.robots.push(robot)
    }

    GetRobotsOwnedByPlayer(owner: Player): Array<Robot> {
        const robots: Array<Robot> = []

        for (const robot of this.robots) {
            if (robot.owner === owner) {
                robots.push(robot)
            }
        }

        return robots
    }

    onStart(): void {
        events.AddRobot.connect((player) => {
            this.AddRobot(player)
        })
    }
}