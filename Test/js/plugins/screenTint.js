/*:
 * @target MZ
 * @plugindesc Allows the use of simple screen tints by keyword in plugin commands.
 * @author 
 *
 * @param Simple Screen Tints
 * @type struct<screenTint>[]
 * @default ["{\"keyword\":\"Bright\",\"tone\":\"{\\\"red\\\":\\\"0\\\",\\\"green\\\":\\\"0\\\",\\\"blue\\\":\\\"0\\\",\\\"gray\\\":\\\"0\\\"}\"}"]
 * @desc These single-tone screen tints can be invoked by keyword in plugin commands.
 *
 * @command ApplyScreenTint
 * @text Apply Screen Tint
 * @desc Applies a screen tint based on the keyword.
 *
 * @arg keyword
 * @type string
 * @default Bright
 * @desc The keyword of the screen tint to apply.
 *
 * @arg duration
 * @type number
 * @default 60
 * @desc Duration of the tint effect in frames (60 frames = 1 second).
 *
 * @help
 * == Instructions ==
 * 1. In the Plugin Manager, enable this plugin.
 * 2. Define your screen tints in the plugin parameters.
 * 3. Use the Plugin Command "Apply Screen Tint" with the desired keyword.
 *
 * == Example Plugin Command ==
 * ApplyScreenTint: (Keyword: Bright, Duration: 60)
 */

/*~struct~screenTint:
 * @param keyword
 * @text Keyword
 * @type text
 * @desc The keyword to call for this screen tint in plugin commands.
 * 
 * @param tone
 * @text Tone
 * @type struct<tone>
 * @desc The screen tone to apply when a plugin command calls for this tint.
 */

/*~struct~tone:
 * @param red
 * @text Red
 * @type number
 * @min -255
 * @max 255
 * @default 0
 * @desc Red tone value (-255 to 255).
 *
 * @param green
 * @text Green
 * @type number
 * @min -255
 * @max 255
 * @default 0
 * @desc Green tone value (-255 to 255).
 *
 * @param blue
 * @text Blue
 * @type number
 * @min -255
 * @max 255
 * @default 0
 * @desc Blue tone value (-255 to 255).
 *
 * @param gray
 * @text Gray
 * @type number
 * @min 0
 * @max 255
 * @default 0
 * @desc Gray-scale intensity (0 to 255).
 */

(() => {
    const pluginName = "ScreenTint";
    const parameters = PluginManager.parameters(pluginName);
    const screenTints = JSON.parse(parameters["Simple Screen Tints"]).map(tint => JSON.parse(tint));

    PluginManager.registerCommand(pluginName, "ApplyScreenTint", args => {
        const keyword = args.keyword;
        const duration = Number(args.duration || 60);
        const tint = screenTints.find(t => t.keyword === keyword);

        if (tint) {
            const tone = JSON.parse(tint.tone);
            const red = Number(tone.red);
            const green = Number(tone.green);
            const blue = Number(tone.blue);
            const gray = Number(tone.gray);

            console.log(`Applying Screen Tint: keyword=${keyword}, red=${red}, green=${green}, blue=${blue}, gray=${gray}, duration=${duration}`);

            $gameScreen.startTint([red, green, blue, gray], duration);
        } else {
            console.warn(`Screen Tint not found for keyword: ${keyword}`);
        }
    });
})();