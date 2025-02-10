/*:
 * @target MZ
 * @plugindesc Allows screen tinting with plugin commands.
 * @author Bryce Lynd
 *
 * @command TintScreen
 * @text Tint Screen
 * @desc Tints the screen with a specified color and duration.
 *
 * @arg red
 * @type number
 * @min -255
 * @max 255
 * @default 0
 * @desc Red tint value (-255 to 255).
 *
 * @arg green
 * @type number
 * @min -255
 * @max 255
 * @default 0
 * @desc Green tint value (-255 to 255).
 *
 * @arg blue
 * @type number
 * @min -255
 * @max 255
 * @default 0
 * @desc Blue tint value (-255 to 255).
 *
 * @arg gray
 * @type number
 * @min 0
 * @max 255
 * @default 0
 * @desc Gray-scale intensity (0 to 255).
 *
 * @arg duration
 * @type number
 * @min 1
 * @max 999
 * @default 60
 * @desc Duration of the tint effect in frames (60 frames = 1 second).
 *
 * @help
 * == Instructions ==
 * 1. In the Plugin Manager, enable "ScreenTint".
 * 2. In an event, use the Plugin Command "Tint Screen".
 * 3. Set the red, green, blue, gray values (-255 to 255).
 * 4. Set the duration (e.g., 60 for 1 second).
 *
 * == Example Plugin Command ==
 * TintScreen: (Red: -100, Green: -100, Blue: 0, Gray: 100, Duration: 60)
 */

(() => {
    const pluginName = "ScreenTint";

    PluginManager.registerCommand(pluginName, "TintScreen", args => {
        const red = args.red !== undefined ? Number(args.red) : 0;
        const green = args.green !== undefined ? Number(args.green) : 0;
        const blue = args.blue !== undefined ? Number(args.blue) : 0;
        const gray = args.gray !== undefined ? Number(args.gray) : 0;
        const duration = args.duration !== undefined ? Number(args.duration) : 60;

        console.log(`TintScreen Command Executed: red=${red}, green=${green}, blue=${blue}, gray=${gray}, duration=${duration}`);

        $gameScreen.startTint([red, green, blue, gray], duration);
    });
})();
