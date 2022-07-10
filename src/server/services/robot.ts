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

    RenderDebugPath(path: Path): void {
        const waypoints = path.GetWaypoints()
        const debugFolder = (workspace.FindFirstChild("debug") || workspace) as Folder

        for (let i=0; i < waypoints.size() - 1; i++) {
            const pointPart = new Instance("Part")
            pointPart.Size = Vector3.one
            pointPart.Position = waypoints[i].Position
            pointPart.CanCollide = false
            pointPart.Anchored = true
            pointPart.Shape = Enum.PartType.Ball
            pointPart.TopSurface = Enum.SurfaceType.Smooth
            pointPart.BottomSurface = Enum.SurfaceType.Smooth
            pointPart.Color = Color3.fromRGB(225, 100, 75)
            pointPart.Name = tostring(i)
            pointPart.Parent = debugFolder

            let pathColor = Color3.fromRGB(75, 225, 100)
            if (waypoints[i + 1].Action === Enum.PathWaypointAction.Jump) {
                pathColor = Color3.fromRGB(75, 100, 225)
            }

            const pathPart = new Instance("Part")
            pathPart.Size = new Vector3(0.25, 0.25, waypoints[i].Position.sub(waypoints[i + 1].Position).Magnitude)
            pathPart.CFrame = CFrame.lookAt(
                waypoints[i].Position.sub(waypoints[i].Position.sub(waypoints[i + 1].Position).div(2)),
                waypoints[i + 1].Position
            )
            pathPart.CanCollide = false
            pathPart.Anchored = true
            pathPart.TopSurface = Enum.SurfaceType.Smooth
            pathPart.BottomSurface = Enum.SurfaceType.Smooth
            pathPart.Color = pathColor
            pathPart.Name = tostring(i)
            pathPart.Parent = debugFolder
        }
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