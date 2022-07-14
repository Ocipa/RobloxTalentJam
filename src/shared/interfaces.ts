





export interface RobotModel extends Model {
    Humanoid: Humanoid
    PrimaryPart: Part
}


export interface Pile extends Model {
    boxes: Folder
    Part: Part
    ClickDetector: ClickDetector
}