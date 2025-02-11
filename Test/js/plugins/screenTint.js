//=============================================================================
// ScreenTint
// For RPG Maker MZ
// by Bryce Lynd
//=============================================================================

var Imported = Imported || {};
Imported.McKathlin_DayNight = true;

var McKathlin = McKathlin || {};
McKathlin.DayNight = McKathlin.DayNight || {};

/*:
 * @target MZ
 * @plugindesc Allows the use of simple screen tints by keyword in plugin commands.
 * @author 
 *
 * @param Simple Lighting Presets
 * @type struct<lightingPreset>[]
 * @default ["{\"keyword\":\"Bright\",\"tone\":\"{\\\"red\\\":\\\"0\\\",\\\"green\\\":\\\"0\\\",\\\"blue\\\":\\\"0\\\",\\\"gray\\\":\\\"0\\\"}\"}", "{\"keyword\":\"Red\",\"tone\":\"{\\\"red\\\":\\\"255\\\",\\\"green\\\":\\\"0\\\",\\\"blue\\\":\\\"0\\\",\\\"gray\\\":\\\"0\\\"}\"}"]
 * @desc These single-tone lighting presets can be invoked by keyword in plugin commands.
 *
 * @command useLightingPreset
 * @text Use Lighting Preset
 * @desc Tint screen to a lighting preset defined in the plugin parameters.
 *
 * @arg lightingKeyword
 * @text Lighting Keyword
 * @desc The keyword of the lighting preset, as defined in the plugin parameters.
 *
 * @arg duration
 * @text Duration
 * @default 60
 * @desc Frames (1/60 sec) over which to tint screen to lighting.
 *
 * @help
 * == Instructions ==
 * 1. In the Plugin Manager, enable this plugin.
 * 2. Define your lighting presets in the plugin parameters.
 * 3. Use the Plugin Command "Use Lighting Preset" with the desired keyword.
 *
 * == Example Plugin Command ==
 * UseLightingPreset: (Keyword: Bright, Duration: 60)
 */

/*~struct~lightingPreset:
 * @param keyword
 * @text Keyword
 * @type text
 * @desc The keyword to call for this lighting preset in plugin commands.
 * 
 * @param tone
 * @text Tone
 * @type struct<tone>
 * @desc The screen tone to apply when a plugin command calls for this preset.
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
    const pluginName = "SimpleScreenTint";
    const parameters = PluginManager.parameters(pluginName);
    const lightingPresets = JSON.parse(parameters["Simple Lighting Presets"]).map(preset => JSON.parse(preset));

    PluginManager.registerCommand(pluginName, "useLightingPreset", args => {
        const keyword = args.lightingKeyword;
        const duration = Number(args.duration || 60);
        const preset = lightingPresets.find(p => p.keyword === keyword);

        if (preset) {
            const tone = JSON.parse(preset.tone);
            const red = Number(tone.red);
            const green = Number(tone.green);
            const blue = Number(tone.blue);
            const gray = Number(tone.gray);

            console.log(`Applying Lighting Preset: keyword=${keyword}, red=${red}, green=${green}, blue=${blue}, gray=${gray}, duration=${duration}`);

            $gameScreen.startTint([red, green, blue, gray], duration);
        } else {
            console.warn(`Lighting Preset not found for keyword: ${keyword}`);
        }
    });
})();