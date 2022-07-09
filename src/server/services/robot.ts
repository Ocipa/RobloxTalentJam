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

        const starts = workspace.FindFirstChild("starts") as Folder
        for (const start of starts.GetChildren() as Array<Part>) {
            const test2 = workspace.FindFirstChild("test2") as Part

            const robot = this.AddRobot(undefined, start.Position)
            const path = robot.ComputePath(test2.Position)

            this.RenderPath(path)
        }
    }

    AddRobot(owner?: Player, position?: Vector3): Robot {
        const robot = new Robot(owner, position)
        this.robots.push(robot)

        return robot
    }

    FinishedMoveTo(robot: Robot): void {

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

    RenderPath(path: Path): void {
        const waypoints = path.GetWaypoints()

        for (let i=0; i < waypoints.size() - 1; i++) {
            const part = new Instance("Part")
            part.Size = Vector3.one
            part.Position = waypoints[i].Position
            part.CanCollide = false
            part.Anchored = true
            part.Shape = Enum.PartType.Ball
            part.TopSurface = Enum.SurfaceType.Smooth
            part.BottomSurface = Enum.SurfaceType.Smooth
            part.Color = Color3.fromRGB(225, 100, 75)
            part.Parent = workspace

            const middle = new Instance("Part")
            middle.Size = new Vector3(0.25, 0.25, waypoints[i].Position.sub(waypoints[i + 1].Position).Magnitude)
            middle.CFrame = CFrame.lookAt(
                waypoints[i].Position.sub(waypoints[i].Position.sub(waypoints[i + 1].Position).div(2)),
                waypoints[i + 1].Position
            )
            middle.CanCollide = false
            middle.Anchored = true
            middle.TopSurface = Enum.SurfaceType.Smooth
            middle.BottomSurface = Enum.SurfaceType.Smooth
            middle.Color = Color3.fromRGB(75, 225, 100)
            middle.Parent = workspace
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