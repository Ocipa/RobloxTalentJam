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

    RemoveRobot(owner?: Player) {
        let oldestRobot: Robot | undefined

        for (const robot of this.robots) {
            if (!owner || robot.owner === owner) {
                if (!oldestRobot || robot.timestamp < oldestRobot.timestamp) {
                    oldestRobot = robot
                }
            }
        }

        if (oldestRobot) {
            const index = this.robots.indexOf(oldestRobot)
            this.robots.remove(index)

            oldestRobot.Destroy()
        }
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

        events.RemoveRobot.connect((player) => {
            this.RemoveRobot(player)
        })
    }

    tickDebounce = 0
    onTick(dt: number): void {
        this.tickDebounce += dt

        if(this.tickDebounce < 0.2) {
            return
        }
        this.tickDebounce = 0

        for (const robot of this.robots) {
            const position = robot.model.PrimaryPart.Position
            const isNear = robot.lastPosition.FuzzyEq(position, 0.01)

            if (isNear) {
                robot.ComputePath(undefined, true)
                robot.MoveToNextWaypoint()

                if (robot.stuckLastTick) {
                    robot.Jump()
                }
            } else {
                robot.lastPosition = position
            }

            if (robot.waypoints.size() - robot.currentWaypoint > 2 && !robot.nextMove && robot.moving) {
                robot.stuckLastTick = isNear
            } else {
                robot.stuckLastTick = false
            }
        }
    }
}