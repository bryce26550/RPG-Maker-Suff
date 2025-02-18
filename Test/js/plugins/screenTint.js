/*:
 * @target MZ
 * @plugindesc Allows changing screen tint dynamically via plugin commands.
 * @author Bryce Lynd
 *
 * @help
 * === Plugin Commands ===
 * TintScreen [R] [G] [B] [Gray] [Duration]
 *  - R, G, B: Red, Green, Blue values (-255 to 255)
 *  - Gray: Gray intensity (0 to 255)
 *  - Duration: Frames for transition (0 for instant)
 *
 * Example:
 * TintScreen 255 0 0 0 60
 * (This will create a bright red effect over 60 frames)
 *
 * @command TintScreen
 * @text Change Screen Tint
 * @desc Adjusts the screen tint effect.
 *
 * @arg red
 * @type number
 * @min -255
 * @max 255
 * @default 0
 * @desc Red tint intensity (-255 to 255).
 *
 * @arg green
 * @type number
 * @min -255
 * @max 255
 * @default 0
 * @desc Green tint intensity (-255 to 255).
 *
 * @arg blue
 * @type number
 * @min -255
 * @max 255
 * @default 0
 * @desc Blue tint intensity (-255 to 255).
 *
 * @arg gray
 * @type number
 * @min 0
 * @max 255
 * @default 0
 * @desc Gray intensity (0 to 255).
 *
 * @arg duration
 * @type number
 * @min 0
 * @default 60
 * @desc Duration of the transition in frames (0 for instant).
 */
(() => {
    const pluginName = "ScreenTint";
    
    PluginManager.registerCommand(pluginName, "TintScreen", args => {
        const r = Number(args.red) || 0;
        const g = Number(args.green) || 0;
        const b = Number(args.blue) || 0;
        const gray = Number(args.gray) || 0;
        const duration = Number(args.duration) || 0;
        
        $gameScreen.startTint([r, g, b, gray], duration);
    });
})();
