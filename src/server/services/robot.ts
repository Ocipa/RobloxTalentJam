import { OnStart, OnTick, Service } from "@flamework/core";
import { Robot } from "shared/robot";
import { events } from "./networking";


const workspace = game.GetService("Workspace")
const replicatedStorage = game.GetService("ReplicatedStorage")
const pathfindingService = game.GetService("PathfindingService")

@Service()
export class RobotService implements OnStart, OnTick {
    robots: Array<Robot>

    constructor() {
        this.robots = []
    }

    AddRobot(owner?: Player, position?: Vector3): Robot {
        const robot = new Robot(owner, position)
        this.robots.push(robot)

        return robot
    }

    FinishedMoveTo(robot: Robot): void {
        robot.moving = false
        robot.MoveToNextWaypoint()
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

    GetFollowingRobots(owner?: Player): Array<Robot> {
        const robots: Array<Robot> = []

        for (const robot of this.robots) {
            if ((owner && robot.owner === owner || !owner) && robot.action === "following") {
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

    count = 0
    onTick(dt: number): void {
        this.count++

        if (this.count < 60) {return}
        this.count = 0


    }
}