import { Flamework } from "@flamework/core";




Flamework.addPaths("./services")
Flamework.addPaths("./components")


const collectionService = game.GetService("CollectionService")
const players = game.GetService("Players")
const workspace = game.GetService("Workspace")

players.PlayerAdded.Connect((player) => {
    collectionService.AddTag(player, "player")
})


for (const player of players.GetPlayers()) {
    collectionService.AddTag(player, "player")
}


// for (const door of workspace.GetChildren()) {
//     if (door.Name !== "Door") {
//         continue
//     }


// }


Flamework.ignite()


// print(collectionService.GetTagged("Door"))