/*
 * Madallal Post Animator  (After Effects ExtendScript)
 * -----------------------------------------------------
 * Builds the full 10-second animation for the post
 *   "Dawwir, ikhtar, wistafid.. wiya Madallal" (Alwatani / Earthlink)
 * from the layered PSD: 1080 x 1350, 30 fps, 10 s.
 *
 * Story:
 *   1. Background push-in + floating blurred coins
 *   2. Logo drops in
 *   3. Chair rises from the bottom and lands with a squash
 *   4. Phone grows up out of the chair, neon frame flickers on
 *   5. Character pops out of the chair
 *   6. Headline wipes in right-to-left (RTL), the yellow accent pops
 *   7. Every product sticker bursts out of the chair / phone /
 *      character on an arc (pop-up), then wiggles until the end
 *   8. Footer slides up, light sweep passes over the headline
 *
 * Usage: File > Scripts > Run Script File... > this file.
 * When done it exports <PSD folder>/Madallal_Post_1080x1350.mp4 (H.264).
 * Every setting lives in CONFIG / TIMING below.
 */

(function MadallalPostAnimator() {

    // ------------------------------------------------------------------
    // CONFIG
    // ------------------------------------------------------------------
    var CONFIG = {
        psdPath: "D:\\2026\\\u062a\u062d\u0631\u064a\u0643 \u0628\u0648\u0633\u062a\u0627\u062a\\\u062a\u062d\u0631\u064a\u0643 \u0628\u0648\u0633\u062a \u062c\u062f\u064a\u062f\\\u062f\u0648\u0631\u060c \u0627\u062e\u062a\u0627\u0631\u060c \u0648\u0627\u0633\u062a\u0641\u0627\u062f.. \u0648\u064a\u0627 \u0645\u062f\u0644\u0644..psd",
        finalCompName: "Madallal_Post_1080x1350",
        // MP4 is written next to the PSD with this name
        outputName: "Madallal_Post_1080x1350.mp4",
        width: 1080,
        height: 1350,
        fps: 30,
        duration: 10,
        ctrlName: "CTRL_Wiggle",
        // Linear Wipe angle for the headline: 90 reveals right -> left (Arabic).
        // If it reveals in the wrong direction on your version, set 270.
        headlineWipeAngle: 90,
        swooshWipeAngle: 270
    };

    var TIMING = {
        bgSettle: 1.4,
        bgFloat: 0.3,
        logo: 0.25,
        chair: 0.35,
        phone: 0.8,
        glow: 1.2,
        phoneUI: 1.3,
        phoneUIStagger: 0.06,
        person: 1.15,
        headline: 1.55,
        accent: 2.05,
        elements: 1.85,
        elementStagger: 0.075,
        footer: 2.6,
        footerStagger: 0.1,
        fade: 1.0,
        shines: [3.6, 6.8]
    };

    // Wiggle defaults (live-editable later on the CTRL_Wiggle null)
    var WIGGLE = { freq: 1.2, posAmp: 9, rotAmp: 5, breath: 3 };

    // Root-comp pixels per design pixel (1 when the PSD is 1080 wide)
    var U = 1;

    // ------------------------------------------------------------------
    // ROLES
    // ------------------------------------------------------------------
    var ROLES = [
        { id: "IGNORE",          label: "- Static (no animation)" },
        { id: "BG",              label: "Background" },
        { id: "BG_FLOAT",        label: "Background floating coin" },
        { id: "LOGO",            label: "Logo (top)" },
        { id: "HEADLINE",        label: "Headline text" },
        { id: "HEADLINE_ACCENT", label: "Headline accent (\u0648\u064a\u0627 \u0645\u062f\u0644\u0644)" },
        { id: "CHAIR",           label: "Chair" },
        { id: "PHONE",           label: "Phone" },
        { id: "PHONE_GLOW",      label: "Phone neon glow / frame" },
        { id: "PHONE_UI",        label: "Phone screen UI item" },
        { id: "PERSON",          label: "Character" },
        { id: "ELEMENT",         label: "Pop element + wiggle" },
        { id: "COIN",            label: "Coin element (pop + flip)" },
        { id: "FOOTER",          label: "Footer item" },
        { id: "SWOOSH",          label: "Footer swoosh line" },
        { id: "FADE",            label: "Generic fade-in" }
    ];

    function roleIndex(id) {
        for (var i = 0; i < ROLES.length; i++) if (ROLES[i].id === id) return i;
        return 0;
    }

    // ------------------------------------------------------------------
    // SMALL HELPERS
    // ------------------------------------------------------------------
    function tg(L) { return L.property("ADBE Transform Group"); }
    function pPos(L) { return tg(L).property("ADBE Position"); }
    function pAnc(L) { return tg(L).property("ADBE Anchor Point"); }
    function pScl(L) { return tg(L).property("ADBE Scale"); }
    function pRot(L) { return tg(L).property("ADBE Rotate Z"); }
    function pOpa(L) { return tg(L).property("ADBE Opacity"); }

    function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
    function lerp(a, b, t) { return a + (b - a) * t; }

    // Pad/trim a value so it matches the property's dimensions (2D vs 3D).
    function fitv(prop, v) {
        var cur = prop.value;
        if (!(cur instanceof Array)) return (v instanceof Array) ? v[0] : v;
        var out = [];
        for (var i = 0; i < cur.length; i++) out.push(i < v.length ? v[i] : cur[i]);
        return out;
    }

    function dimsFor(prop) {
        var t = prop.propertyValueType;
        if (t === PropertyValueType.TwoD) return 2;
        if (t === PropertyValueType.ThreeD) return 3;
        return 1;
    }

    function easeArr(prop, inf) {
        var d = dimsFor(prop), a = [];
        for (var i = 0; i < d; i++) a.push(new KeyframeEase(0, inf));
        return a;
    }

    // Snappy "pop" easing: fast launch, strong deceleration, soft settles.
    function popEase(prop) {
        var n = prop.numKeys;
        for (var k = 1; k <= n; k++) {
            var inInf = 60, outInf = 60;
            if (k === 1) outInf = 20;
            if (k === 2) { inInf = 85; outInf = 40; }
            try { prop.setTemporalEaseAtKey(k, easeArr(prop, inInf), easeArr(prop, outInf)); } catch (e) {}
        }
    }

    // Set keyframes (times[], values[]) then apply pop easing.
    function K(prop, times, vals, noEase) {
        for (var i = 0; i < times.length; i++) prop.setValueAtTime(times[i], fitv(prop, vals[i]));
        if (!noEase) popEase(prop);
    }

    function addExpr(prop, src) {
        try { prop.expression = src; } catch (e) {}
    }

    function esc(s) { return String(s).replace(/\\/g, "\\\\").replace(/"/g, "\\\""); }

    function vec2(prop) { var v = prop.value; return [v[0], v[1]]; }

    // Move the anchor point to a point given in the layer's comp space,
    // without visually moving the layer.
    function setAnchorToCompPoint(L, pt) {
        try {
            var ap = pAnc(L), pos = pPos(L), sc = pScl(L).value;
            var sx = sc[0] / 100 || 1, sy = sc[1] / 100 || 1;
            var a = ap.value, p = pos.value;
            var na = [a[0] + (pt[0] - p[0]) / sx, a[1] + (pt[1] - p[1]) / sy];
            ap.setValue(fitv(ap, na));
            pos.setValue(fitv(pos, pt));
        } catch (e) {}
    }

    // Root-space point -> the item's own comp space.
    function rootToLocal(item, pt) {
        return [(pt[0] - item.xf.ox) / item.xf.s, (pt[1] - item.xf.oy) / item.xf.s];
    }

    // ------------------------------------------------------------------
    // PROJECT SETUP
    // ------------------------------------------------------------------
    var OUTPUT_FOLDER = null;

    function importPSD() {
        var f = new File(CONFIG.psdPath);
        if (!f.exists) {
            f = File.openDialog("\u0627\u062e\u062a\u0631 \u0645\u0644\u0641 PSD \u0627\u0644\u062e\u0627\u0635 \u0628\u0627\u0644\u0628\u0648\u0633\u062a / Select the post PSD", "*.psd");
            if (!f) return null;
        }
        var io = new ImportOptions(f);
        if (io.canImportAs(ImportAsType.COMP_CROPPED_LAYERS)) {
            io.importAs = ImportAsType.COMP_CROPPED_LAYERS;
        } else {
            io.importAs = ImportAsType.COMP;
        }
        var item = app.project.importFile(io);
        OUTPUT_FOLDER = f.parent;
        return (item instanceof CompItem) ? item : null;
    }

    function prepComp(comp, visited) {
        if (visited[comp.id]) return;
        visited[comp.id] = true;
        comp.frameRate = CONFIG.fps;
        comp.duration = CONFIG.duration;
        comp.motionBlur = true;
        for (var i = 1; i <= comp.numLayers; i++) {
            var L = comp.layer(i);
            if (L.source instanceof CompItem) prepComp(L.source, visited);
            try { L.inPoint = 0; } catch (e1) {}
            try { L.outPoint = CONFIG.duration; } catch (e2) {}
        }
    }

    // ------------------------------------------------------------------
    // LAYER COLLECTION + GEOMETRY
    // ------------------------------------------------------------------
    function layerRectRoot(L, xf) {
        var r = L.sourceRectAtTime(0, false);
        var a = pAnc(L).value, p = pPos(L).value, sc = pScl(L).value;
        var sx = sc[0] / 100, sy = sc[1] / 100;
        var l = p[0] + (r.left - a[0]) * sx;
        var t = p[1] + (r.top - a[1]) * sy;
        var w = r.width * sx, h = r.height * sy;
        var R = { l: xf.ox + xf.s * l, t: xf.oy + xf.s * t, w: w * xf.s, h: h * xf.s };
        R.cx = R.l + R.w / 2; R.cy = R.t + R.h / 2; R.r = R.l + R.w; R.b = R.t + R.h;
        return R;
    }

    function collect(comp, xf, depth, parentItem, out) {
        for (var i = 1; i <= comp.numLayers; i++) {
            var L = comp.layer(i);
            if (!(L instanceof AVLayer)) continue;
            var item = {
                layer: L, comp: comp, depth: depth, xf: xf, parent: parentItem,
                name: L.name, rect: null, role: "IGNORE"
            };
            try { item.rect = layerRectRoot(L, xf); } catch (e) { continue; }
            out.push(item);
            if (L.source instanceof CompItem) {
                var a = pAnc(L).value, p = pPos(L).value, sx = pScl(L).value[0] / 100;
                var cxf = {
                    s: xf.s * sx,
                    ox: xf.ox + xf.s * (p[0] - a[0] * sx),
                    oy: xf.oy + xf.s * (p[1] - a[1] * sx)
                };
                collect(L.source, cxf, depth + 1, item, out);
            }
        }
    }

    // ------------------------------------------------------------------
    // AUTO CLASSIFICATION (names first, then position in the frame)
    // ------------------------------------------------------------------
    function classify(item, W, H) {
        var L = item.layer, r = item.rect, n = item.name.toLowerCase();
        function has(re) { return re.test(n); }

        if (!L.enabled) return "IGNORE";
        if (item.parent && item.parent.role !== "IGNORE") return "IGNORE";
        if (L.adjustmentLayer) return "IGNORE";

        var partlyOff = r.l < -5 || r.t < -5 || r.r > W + 5 || r.b > H + 5;
        var isCoin = has(/coin|\u0639\u0645\u0644\u0629|\u0645\u062f\u0644\u0644/);
        var bigOrEdge = r.w > W * 0.24 || partlyOff || r.cx < W * 0.1 || r.cx > W * 0.9;

        if (r.w >= W * 0.9 && r.h >= H * 0.9) return "BG";
        if (isCoin && bigOrEdge) return "BG_FLOAT";
        if (has(/\bbg\b|background|\u062e\u0644\u0641\u064a|\u062e\u0644\u0641\u064a\u0629/)) return "BG";
        if (has(/glow|neon|\u062a\u0648\u0647\u062c|\u0646\u064a\u0648\u0646|frame|\u0627\u0637\u0627\u0631|\u0625\u0637\u0627\u0631|\u0628\u0631\u0648\u0627\u0632/)) return "PHONE_GLOW";
        if (has(/chair|sofa|couch|\u0643\u0631\u0633\u064a|\u0643\u0646\u0628|\u0642\u0646\u0641\u0629|\u0642\u0646\u0641\u0647/)) return "CHAIR";
        if (has(/phone|mobile|iphone|\u0645\u0648\u0628\u0627\u064a\u0644|\u0647\u0627\u062a\u0641|\u062c\u0648\u0627\u0644|\u062a\u0644\u0641\u0648\u0646/)) return "PHONE";
        if (has(/girl|woman|model|person|character|\u0628\u0646\u062a|\u0641\u062a\u0627\u0629|\u0634\u062e\u0635\u064a|\u0645\u0648\u062f\u064a\u0644|\u0627\u0645\u0631\u0623\u0629|\u0645\u0631\u0623\u0629|\u0641\u062a\u0627\u0647/)) return "PERSON";
        if (has(/swoosh|wave|curve|\u0645\u0648\u062c\u0629|\u0645\u0646\u062d\u0646\u0649/)) return "SWOOSH";
        if (has(/itpc|6119|\u0627\u062a\u0635\u0644|\u0648\u0632\u0627\u0631\u0629|\u062a\u0639\u062a\u0645\u062f/)) return "FOOTER";
        if (has(/logo|\u0644\u0648\u062c\u0648|\u0644\u0648\u063a\u0648|\u0634\u0639\u0627\u0631|\u0627\u0644\u0648\u0637\u0646\u064a|\u0627\u064a\u0631\u062b\u0644\u0646\u0643|earthlink/)) return r.cy > H * 0.8 ? "FOOTER" : "LOGO";
        if (has(/screen|\u0634\u0627\u0634\u0629|\bui\b|\u0648\u0627\u062c\u0647\u0629|\u062a\u0637\u0628\u064a\u0642|\bapp\b/)) return "PHONE_UI";


        if (partlyOff && r.w < W * 0.5 && r.h < H * 0.5) return "BG_FLOAT";

        if (r.cy > H * 0.87) return "FOOTER";
        if (r.cy < H * 0.13) return "LOGO";
        if (r.cy < H * 0.23) return (r.cx < W * 0.38 && r.w < W * 0.4) ? "HEADLINE_ACCENT" : "HEADLINE";

        var small = r.w < W * 0.3 && r.h < H * 0.25;
        var side = r.cx < W * 0.37 || r.cx > W * 0.63;
        if (isCoin && small) return "COIN";
        if (small && side && r.cy > H * 0.25) return "ELEMENT";

        if (r.h > H * 0.4 && r.w > W * 0.3) {
            if (r.b > H * 0.9 && r.w > W * 0.42) return "CHAIR";
            if (r.h > H * 0.55) return "PHONE";
            return "PERSON";
        }
        return "IGNORE";
    }

    // ------------------------------------------------------------------
    // ROLE REVIEW DIALOG
    // ------------------------------------------------------------------
    function reviewDialog(items, compName) {
        var labels = [];
        for (var i = 0; i < ROLES.length; i++) labels.push(ROLES[i].label);

        var w = new Window("dialog", "Madallal Post Animator");
        w.orientation = "column";
        w.alignChildren = ["fill", "top"];
        w.add("statictext", undefined, "Comp: " + compName);
        w.add("statictext", undefined,
            "Roles were auto-detected. Select one or more layers, choose a role and press Assign.");

        var lb = w.add("listbox", [0, 0, 700, 440], [], {
            numberOfColumns: 3, showHeaders: true,
            columnTitles: ["#", "Layer", "Role"], columnWidths: [40, 420, 220],
            multiselect: true
        });
        for (var j = 0; j < items.length; j++) {
            var indent = "";
            for (var d = 0; d < items[j].depth; d++) indent += "    ";
            var li = lb.add("item", String(j + 1));
            li.subItems[0].text = indent + (items[j].depth ? "> " : "") + items[j].name;
            li.subItems[1].text = ROLES[roleIndex(items[j].role)].label;
        }

        var g = w.add("group");
        g.add("statictext", undefined, "Role:");
        var dd = g.add("dropdownlist", undefined, labels);
        dd.selection = 0;
        var assign = g.add("button", undefined, "Assign");

        lb.onChange = function () {
            var s = lb.selection;
            if (s && !(s instanceof Array)) s = [s];
            if (s && s.length) dd.selection = roleIndex(items[s[0].index].role);
        };
        assign.onClick = function () {
            var s = lb.selection;
            if (!s || !dd.selection) return;
            if (!(s instanceof Array)) s = [s];
            for (var k = 0; k < s.length; k++) {
                items[s[k].index].role = ROLES[dd.selection.index].id;
                s[k].subItems[1].text = ROLES[dd.selection.index].label;
            }
        };

        var opt = w.add("panel", undefined, "Options");
        opt.orientation = "row";
        var cbMB = opt.add("checkbox", undefined, "Motion blur");
        cbMB.value = true;
        var cbMP4 = opt.add("checkbox", undefined, "Export MP4 (H.264) when done");
        cbMP4.value = true;

        var b = w.add("group");
        b.alignment = "right";
        b.add("button", undefined, "Cancel", { name: "cancel" });
        b.add("button", undefined, "Build Animation", { name: "ok" });

        if (w.show() !== 1) return null;
        return { motionBlur: cbMB.value, exportMP4: cbMP4.value };
    }

    // ------------------------------------------------------------------
    // SCENE GEOMETRY (root space)
    // ------------------------------------------------------------------
    function unionRect(items, role) {
        var R = null;
        for (var i = 0; i < items.length; i++) {
            if (items[i].role !== role) continue;
            var r = items[i].rect;
            if (!R) R = { l: r.l, t: r.t, r: r.r, b: r.b };
            else {
                R.l = Math.min(R.l, r.l); R.t = Math.min(R.t, r.t);
                R.r = Math.max(R.r, r.r); R.b = Math.max(R.b, r.b);
            }
        }
        if (!R) return null;
        R.w = R.r - R.l; R.h = R.b - R.t; R.cx = R.l + R.w / 2; R.cy = R.t + R.h / 2;
        return R;
    }

    function fallbackRect(l, t, r, b) {
        return { l: l, t: t, r: r, b: b, w: r - l, h: b - t, cx: (l + r) / 2, cy: (t + b) / 2 };
    }

    // Where each sticker is "born": chair for the low ones, the character's
    // head/shoulders for the high ones, the phone edge for everything between.
    function emitterFor(r, scene, W) {
        var side = r.cx < W / 2 ? -1 : 1;
        var src;
        if (r.cy >= scene.chair.t + 100 * U) src = scene.chair;
        else if (r.cy <= scene.person.t + 180 * U) src = scene.person;
        else src = scene.phone;
        var x = src.cx + side * src.w * 0.22;
        var y = clamp(r.cy, src.t + 40 * U, src.b - 40 * U);
        y = lerp(y, src.cy, 0.3);
        return [x, y];
    }

    // ------------------------------------------------------------------
    // CONTROLLER NULL (global wiggle sliders)
    // ------------------------------------------------------------------
    function makeController(root) {
        var n = root.layers.addNull(CONFIG.duration);
        n.name = CONFIG.ctrlName;
        n.label = 9;
        var fx = n.property("ADBE Effect Parade");
        function slider(name, v) {
            var s = fx.addProperty("ADBE Slider Control");
            s.name = name;
            s.property("ADBE Slider Control-0001").setValue(v);
        }
        slider("Wiggle Freq", WIGGLE.freq);
        slider("Wiggle Pos Amp", WIGGLE.posAmp);
        slider("Wiggle Rot Amp", WIGGLE.rotAmp);
        slider("Breath %", WIGGLE.breath);
        return n;
    }

    function ctrlRef(rootName) {
        return 'var c = comp("' + esc(rootName) + '").layer("' + esc(CONFIG.ctrlName) + '");\n';
    }

    // ------------------------------------------------------------------
    // ANIMATIONS
    // ------------------------------------------------------------------
    function animBG(it) {
        var L = it.layer;
        var W = it.comp.width, H = it.comp.height;
        setAnchorToCompPoint(L, [W / 2, H / 2]);
        K(pScl(L), [0, TIMING.bgSettle], [[116, 116], [100, 100]]);
        pScl(L).setValueAtTime(CONFIG.duration, fitv(pScl(L), [104, 104]));
        K(pOpa(L), [0, 0.35], [0, 100]);
    }

    function animBGFloat(it, i) {
        var L = it.layer, t = TIMING.bgFloat + i * 0.12;
        var r = it.rect, c = rootToLocal(it, [r.cx, r.cy]);
        setAnchorToCompPoint(L, c);
        K(pOpa(L), [t, t + 0.6], [0, pOpa(L).value]);
        K(pScl(L), [t, t + 0.8], [[60, 60], vec2(pScl(L))]);
        addExpr(pPos(L), "value + (wiggle(0.3, 30) - value);");
        addExpr(pRot(L), "value + (wiggle(0.25, 12) - value);");
    }

    function animLogo(it, i) {
        var L = it.layer, t = TIMING.logo + i * 0.08, p = vec2(pPos(L));
        K(pPos(L), [t, t + 0.45, t + 0.65], [[p[0], p[1] - 80], [p[0], p[1] + 6], p]);
        K(pOpa(L), [t, t + 0.3], [0, 100]);
    }

    function animChair(it, pivot) {
        var L = it.layer, t = TIMING.chair, H = CONFIG.height * U;
        setAnchorToCompPoint(L, rootToLocal(it, pivot));
        var p = vec2(pPos(L)), dy = H * 0.45 / it.xf.s;
        K(pPos(L), [t, t + 0.45, t + 0.62, t + 0.75],
            [[p[0], p[1] + dy], [p[0], p[1] - 28], [p[0], p[1] + 6], p]);
        K(pScl(L), [t, t + 0.45, t + 0.62, t + 0.8],
            [[94, 108], [97, 104], [108, 92], [100, 100]]);
        K(pOpa(L), [t, t + 0.15], [0, 100]);
    }

    function animPhone(it, pivot, t) {
        var L = it.layer;
        setAnchorToCompPoint(L, rootToLocal(it, pivot));
        var p = vec2(pPos(L));
        K(pScl(L), [t, t + 0.35, t + 0.5, t + 0.65], [[70, 0], [98, 108], [102, 97], [100, 100]]);
        K(pPos(L), [t, t + 0.35], [[p[0], p[1] + 30], p]);
        K(pOpa(L), [t, t + 0.1], [0, 100]);
    }

    function animGlow(it, pivot, parented) {
        var L = it.layer, t = TIMING.glow;
        if (!parented) animPhone(it, pivot, TIMING.phone);
        var o = pOpa(L);
        if (o.numKeys) { while (o.numKeys) o.removeKey(1); }
        var T = [0, t, t + 0.08, t + 0.16, t + 0.24, t + 0.32, t + 0.45];
        var V = [0, 0, 100, 30, 100, 50, 100];
        K(o, T, V, true);
        for (var k = 1; k <= o.numKeys; k++) o.setInterpolationTypeAtKey(k, KeyframeInterpolationType.HOLD);
        o.setInterpolationTypeAtKey(o.numKeys - 1, KeyframeInterpolationType.LINEAR);
        addExpr(o, "var t0 = " + (t + 0.45) + ";\ntime < t0 ? value : value * (0.85 + 0.15 * Math.sin((time - t0) * 3));");
    }

    function animPhoneUI(it, i) {
        var L = it.layer, t = TIMING.phoneUI + i * TIMING.phoneUIStagger, p = vec2(pPos(L));
        K(pPos(L), [t, t + 0.35], [[p[0], p[1] + 28], p]);
        K(pOpa(L), [t, t + 0.25], [0, 100]);
    }

    function animPerson(it, pivot) {
        var L = it.layer, t = TIMING.person;
        setAnchorToCompPoint(L, rootToLocal(it, pivot));
        var p = vec2(pPos(L));
        K(pScl(L), [t, t + 0.3, t + 0.45, t + 0.6], [[0, 0], [106, 110], [97, 96], [100, 100]]);
        K(pRot(L), [t, t + 0.3, t + 0.5], [-8, 3, 0]);
        K(pPos(L), [t, t + 0.3, t + 0.5], [[p[0], p[1] + 60], [p[0], p[1] - 10], p]);
        K(pOpa(L), [t, t + 0.08], [0, 100]);
        // Idle breathing once she has landed
        addExpr(pScl(L), "var t0 = " + (t + 0.6) + ";\nvar r = ease(time, t0, t0 + 1, 0, 1);\nvalue * (1 + 0.006 * Math.sin((time - t0) * 2) * r);");
    }

    function addWipe(L, t, dur, angle) {
        try {
            var fx = L.property("ADBE Effect Parade").addProperty("ADBE Linear Wipe");
            fx.property("ADBE Linear Wipe-0002").setValue(angle);
            fx.property("ADBE Linear Wipe-0003").setValue(80);
            K(fx.property("ADBE Linear Wipe-0001"), [t, t + dur], [100, 0]);
        } catch (e) {}
    }

    function addShine(L, times) {
        try {
            var fx = L.property("ADBE Effect Parade").addProperty("CC Light Sweep");
            var r = L.sourceRectAtTime(0, false);
            var c = fx.property(1);
            var y = r.top + r.height / 2;
            for (var i = 0; i < times.length; i++) {
                c.setValueAtTime(times[i], [r.left - 250, y]);
                c.setValueAtTime(times[i] + 0.9, [r.left + r.width + 250, y]);
            }
            try { fx.property(2).setValue(-25); } catch (e1) {}   // Direction
            try { fx.property(4).setValue(70); } catch (e2) {}    // Width
            try { fx.property(5).setValue(60); } catch (e3) {}    // Sweep Intensity
        } catch (e) {}
    }

    function animHeadline(it, i) {
        var L = it.layer, t = TIMING.headline + i * 0.1;
        var r = it.rect, c = rootToLocal(it, [r.cx, r.cy]);
        setAnchorToCompPoint(L, c);
        var p = vec2(pPos(L));
        addWipe(L, t, 0.7, CONFIG.headlineWipeAngle);
        K(pPos(L), [t, t + 0.6], [[p[0], p[1] + 25], p]);
        K(pScl(L), [t, t + 0.6], [[92, 92], [100, 100]]);
        K(pOpa(L), [t, t + 0.2], [0, 100]);
        addShine(L, TIMING.shines);
    }

    function animAccent(it, i) {
        var L = it.layer, t = TIMING.accent + i * 0.1;
        var r = it.rect;
        // Pivot on the right edge: it springs out of the main headline (RTL)
        setAnchorToCompPoint(L, rootToLocal(it, [r.r, r.cy]));
        K(pScl(L), [t, t + 0.3, t + 0.45, t + 0.6], [[0, 0], [120, 120], [95, 95], [100, 100]]);
        K(pRot(L), [t, t + 0.3, t + 0.5], [-10, 4, 0]);
        K(pOpa(L), [t, t + 0.08], [0, 100]);
        addExpr(pRot(L), "var t0 = " + (t + 0.6) + ";\ntime < t0 ? value : value + Math.sin((time - t0) * 2.2) * 1.5;");
        addShine(L, [TIMING.shines[0] + 0.25, TIMING.shines[1] + 0.25]);
    }

    function animElement(it, t, origin, W, rootName, isCoin) {
        var L = it.layer, r = it.rect;
        var side = r.cx < W / 2 ? -1 : 1;
        setAnchorToCompPoint(L, rootToLocal(it, [r.cx, r.cy]));
        var fin = vec2(pPos(L));
        var o = rootToLocal(it, origin);
        var dx = fin[0] - o[0], dy = fin[1] - o[1];
        var len = Math.sqrt(dx * dx + dy * dy) || 1;
        var ov = [fin[0] + dx / len * 14, fin[1] + dy / len * 14];
        var sc = vec2(pScl(L));

        var P = pPos(L);
        K(P, [t, t + 0.38, t + 0.6], [o, ov, fin]);
        // Arc: launch upward-outward, land from above.
        try {
            var n = P.value.length, z = [];
            for (var q = 0; q < n; q++) z.push(0);
            var tan = function (x, y) { var a = z.slice(0); a[0] = x; a[1] = y; return a; };
            for (var k = 1; k <= P.numKeys; k++) P.setSpatialAutoBezierAtKey(k, false);
            P.setSpatialTangentsAtKey(1, z, tan(dx * 0.35, -110));
            P.setSpatialTangentsAtKey(2, tan(-dx * 0.25, -40), z);
            P.setSpatialTangentsAtKey(3, z, z);
        } catch (e) {}

        K(pScl(L), [t, t + 0.35, t + 0.5, t + 0.62],
            [[0, 0], [sc[0] * 1.18, sc[1] * 1.18], [sc[0] * 0.94, sc[1] * 0.94], sc]);
        var r0 = pRot(L).value;
        K(pRot(L), [t, t + 0.4, t + 0.6], [r0 + side * 90, r0 - side * 8, r0]);
        K(pOpa(L), [t, t + 0.08], [0, pOpa(L).value || 100]);

        // Continuous wiggle, fading in right after the pop settles.
        var t0 = (t + 0.62).toFixed(3);
        var head = ctrlRef(rootName) +
            "var t0 = " + t0 + ";\n" +
            "var r = ease(time, t0, t0 + 0.8, 0, 1);\n" +
            "var f = c.effect(\"Wiggle Freq\")(\"Slider\") * (0.8 + (index % 5) * 0.1);\n";
        addExpr(P, head + "var a = c.effect(\"Wiggle Pos Amp\")(\"Slider\");\nvalue + (wiggle(f, a) - value) * r;");
        addExpr(pRot(L), head + "var a = c.effect(\"Wiggle Rot Amp\")(\"Slider\");\nvalue + (wiggle(f * 0.8, a) - value) * r;");

        if (isCoin) {
            // Quick coin flip every 3 s on top of the breathing
            addExpr(pScl(L), head +
                "var b = c.effect(\"Breath %\")(\"Slider\") / 100;\n" +
                "var s = 1 + b * Math.sin((time - t0) * 2.2 + index) * r;\n" +
                "var v = value * s;\n" +
                "if (time > t0 + 0.5) {\n" +
                "  var lt = (time - t0 - 0.5) % 3;\n" +
                "  if (lt < 0.6) v[0] = v[0] * Math.cos(ease(lt, 0, 0.6, 0, 1) * Math.PI * 2);\n" +
                "}\n" +
                "v;");
        } else {
            addExpr(pScl(L), head +
                "var b = c.effect(\"Breath %\")(\"Slider\") / 100;\n" +
                "value * (1 + b * Math.sin((time - t0) * 2.2 + index) * r);");
        }
    }

    function animFooter(it, i) {
        var L = it.layer, t = TIMING.footer + i * TIMING.footerStagger, p = vec2(pPos(L));
        K(pPos(L), [t, t + 0.5], [[p[0], p[1] + 40], p]);
        K(pOpa(L), [t, t + 0.3], [0, 100]);
    }

    function animSwoosh(it) {
        var L = it.layer, t = TIMING.footer - 0.1;
        addWipe(L, t, 0.8, CONFIG.swooshWipeAngle);
    }

    function animFade(it, i) {
        var t = TIMING.fade + i * 0.05;
        K(pOpa(it.layer), [t, t + 0.4], [0, pOpa(it.layer).value || 100]);
    }

    // ------------------------------------------------------------------
    // MP4 EXPORT
    // ------------------------------------------------------------------
    function findTemplate(list, patterns) {
        for (var p = 0; p < patterns.length; p++) {
            for (var i = 0; i < list.length; i++) if (patterns[p].test(list[i])) return list[i];
        }
        return null;
    }

    // Returns a status message. Renders in AE directly when an H.264 output
    // template exists (AE 2023+); otherwise saves the project and sends it
    // to Adobe Media Encoder.
    function exportMP4(comp) {
        var folder = OUTPUT_FOLDER || (app.project.file ? app.project.file.parent : Folder.desktop);
        var out = new File(folder.fsName + "/" + CONFIG.outputName);
        var rq = app.project.renderQueue;
        var item = rq.items.add(comp);
        try {
            var rs = findTemplate(item.templates, [/^Best Settings$/i, /best/i]);
            if (rs) item.applyTemplate(rs);
        } catch (e0) {}
        var om = item.outputModule(1);
        var h264 = null;
        try { h264 = findTemplate(om.templates, [/H\.264.*Match Render Settings.*15/i, /H\.264/i]); } catch (e1) {}

        if (h264) {
            om.applyTemplate(h264);
            om.file = out;
            // Render only this item
            for (var i = 1; i <= rq.numItems; i++) {
                var ri = rq.item(i);
                if (ri !== item && ri.status === RQItemStatus.QUEUED) ri.render = false;
            }
            rq.render();
            return "MP4 exported:\n" + out.fsName;
        }

        // Older AE: hand over to Media Encoder (project must be saved first)
        om.file = new File(out.fsName.replace(/\.mp4$/i, ".mov"));
        if (!app.project.file) {
            app.project.save(new File(folder.fsName + "/" + CONFIG.finalCompName + ".aep"));
        } else {
            app.project.save();
        }
        if (rq.canQueueInAME) {
            rq.queueInAME(true);
            return "Sent to Adobe Media Encoder. Choose the H.264 preset there if it is not selected.\n" +
                "Output folder: " + folder.fsName;
        }
        return "No H.264 template found and Media Encoder is not available.\n" +
            "The comp is in the Render Queue; render it manually.";
    }

    // ------------------------------------------------------------------
    // MAIN
    // ------------------------------------------------------------------
    app.beginUndoGroup("Madallal Post Animator");
    try {
        var root = null;
        var active = app.project.activeItem;
        if (active instanceof CompItem &&
            confirm("Use the active comp \"" + active.name + "\" instead of importing the PSD?")) {
            root = active;
        } else {
            root = importPSD();
        }
        if (!root) { alert("PSD comp not found / import cancelled."); return; }

        prepComp(root, {});

        var W = root.width, H = root.height;
        U = W / CONFIG.width;
        var items = [];
        collect(root, { s: 1, ox: 0, oy: 0 }, 0, null, items);
        if (!items.length) { alert("No layers found in " + root.name); return; }

        // Normalise geometry to the 1080x1350 design space for classification
        var nx = CONFIG.width / W;
        for (var i = 0; i < items.length; i++) {
            var r = items[i].rect;
            var nr = { l: r.l * nx, t: r.t * nx, w: r.w * nx, h: r.h * nx };
            nr.r = nr.l + nr.w; nr.b = nr.t + nr.h; nr.cx = nr.l + nr.w / 2; nr.cy = nr.t + nr.h / 2;
            items[i].role = classify({ layer: items[i].layer, rect: nr, name: items[i].name,
                parent: items[i].parent }, CONFIG.width, CONFIG.height);
        }

        var opts = reviewDialog(items, root.name);
        if (!opts) return;

        // Scene rects (root space)
        var s = U;
        var scene = {
            phone: unionRect(items, "PHONE") || fallbackRect(335 * s, 315 * s, 735 * s, 1120 * s),
            chair: unionRect(items, "CHAIR") || fallbackRect(270 * s, 740 * s, 800 * s, 1280 * s),
            person: unionRect(items, "PERSON") || fallbackRect(330 * s, 445 * s, 750 * s, 1030 * s)
        };
        var chairPivot = [scene.chair.cx, scene.chair.b];
        var phonePivot = [scene.phone.cx, scene.phone.b];
        var personPivot = [scene.person.cx, scene.person.t + scene.person.h * 0.92];

        makeController(root);

        // Group by role, keeping stacking order
        var by = {};
        for (var k = 0; k < ROLES.length; k++) by[ROLES[k].id] = [];
        for (var m = 0; m < items.length; m++) by[items[m].role].push(items[m]);

        // Parent glow / UI to the main phone layer when they share a comp
        var mainPhone = null;
        for (var p1 = 0; p1 < by.PHONE.length; p1++) {
            if (!mainPhone || by.PHONE[p1].rect.w * by.PHONE[p1].rect.h > mainPhone.rect.w * mainPhone.rect.h)
                mainPhone = by.PHONE[p1];
        }
        var tryParent = function (it) {
            if (!mainPhone || it.comp !== mainPhone.comp || it.layer === mainPhone.layer) return false;
            try { it.layer.parent = mainPhone.layer; return true; } catch (e) { return false; }
        };
        var glowParented = [];
        for (var g1 = 0; g1 < by.PHONE_GLOW.length; g1++) glowParented.push(tryParent(by.PHONE_GLOW[g1]));
        var uiParented = [];
        for (var u1 = 0; u1 < by.PHONE_UI.length; u1++) uiParented.push(tryParent(by.PHONE_UI[u1]));

        var a;
        for (a = 0; a < by.BG.length; a++) animBG(by.BG[a]);
        for (a = 0; a < by.BG_FLOAT.length; a++) animBGFloat(by.BG_FLOAT[a], a);
        for (a = 0; a < by.LOGO.length; a++) animLogo(by.LOGO[a], a);
        for (a = 0; a < by.CHAIR.length; a++) animChair(by.CHAIR[a], chairPivot);
        for (a = 0; a < by.PHONE.length; a++) animPhone(by.PHONE[a], phonePivot, TIMING.phone);
        for (a = 0; a < by.PHONE_GLOW.length; a++) animGlow(by.PHONE_GLOW[a], phonePivot, glowParented[a]);
        for (a = 0; a < by.PHONE_UI.length; a++) {
            if (!uiParented[a]) {
                // Not parented: grow with the phone, then cascade in
                setAnchorToCompPoint(by.PHONE_UI[a].layer, rootToLocal(by.PHONE_UI[a], phonePivot));
            }
            animPhoneUI(by.PHONE_UI[a], a);
        }
        for (a = 0; a < by.PERSON.length; a++) animPerson(by.PERSON[a], personPivot);
        for (a = 0; a < by.HEADLINE.length; a++) animHeadline(by.HEADLINE[a], a);
        for (a = 0; a < by.HEADLINE_ACCENT.length; a++) animAccent(by.HEADLINE_ACCENT[a], a);

        // Elements: top to bottom, burst one after another
        var els = by.ELEMENT.concat(by.COIN);
        els.sort(function (x, y) { return x.rect.cy - y.rect.cy; });
        var popTimes = [];
        for (a = 0; a < els.length; a++) {
            var t = TIMING.elements + a * TIMING.elementStagger;
            popTimes.push(t);
            animElement(els[a], t, emitterFor(els[a].rect, scene, W), W, root.name, els[a].role === "COIN");
        }

        // Footer: sort right-to-left for RTL reading
        by.FOOTER.sort(function (x, y) { return y.rect.cx - x.rect.cx; });
        for (a = 0; a < by.FOOTER.length; a++) animFooter(by.FOOTER[a], a);
        for (a = 0; a < by.SWOOSH.length; a++) animSwoosh(by.SWOOSH[a]);
        for (a = 0; a < by.FADE.length; a++) animFade(by.FADE[a], a);

        // Motion blur + collapse transformations so stickers are not clipped
        // by cropped group comps while they fly out.
        for (var z = 0; z < items.length; z++) {
            var itz = items[z];
            if (itz.role === "IGNORE") continue;
            if (opts.motionBlur) { try { itz.layer.motionBlur = true; } catch (e3) {} }
            var up = itz.parent;
            while (up) {
                try { up.layer.collapseTransformation = true; } catch (e4) {}
                if (opts.motionBlur) { try { up.layer.motionBlur = true; } catch (e5) {} }
                up = up.parent;
            }
        }

        // Final 1080x1350 comp
        var fin = app.project.items.addComp(CONFIG.finalCompName, CONFIG.width, CONFIG.height, 1,
            CONFIG.duration, CONFIG.fps);
        fin.bgColor = [0.02, 0.18, 0.62];
        fin.motionBlur = opts.motionBlur;
        var RL = fin.layers.add(root);
        var fit = Math.max(CONFIG.width / W, CONFIG.height / H) * 100;
        pScl(RL).setValue(fitv(pScl(RL), [fit, fit]));
        pPos(RL).setValue(fitv(pPos(RL), [CONFIG.width / 2, CONFIG.height / 2]));
        try { RL.collapseTransformation = true; } catch (e6) {}
        if (opts.motionBlur) { try { RL.motionBlur = true; } catch (e7) {} }

        // SFX sync markers
        try {
            var mk = fin.markerProperty;
            var mark = function (tm, txt) { mk.setValueAtTime(tm, new MarkerValue(txt)); };
            mark(TIMING.chair, "SFX: whoosh up (chair)");
            mark(TIMING.chair + 0.62, "SFX: soft thump (chair lands)");
            mark(TIMING.phone, "SFX: rise / swell (phone)");
            mark(TIMING.glow, "SFX: neon buzz");
            mark(TIMING.person, "SFX: pop (character)");
            mark(TIMING.headline, "SFX: swipe (headline)");
            for (var pm = 0; pm < popTimes.length; pm++) mark(popTimes[pm], "SFX: pop " + (pm + 1));
            mark(TIMING.footer, "SFX: soft whoosh (footer)");
            for (var sh = 0; sh < TIMING.shines.length; sh++) mark(TIMING.shines[sh], "SFX: shimmer");
        } catch (e8) {}

        fin.openInViewer();

        var exportMsg = "";
        if (opts.exportMP4) {
            try { exportMsg = "\n\n" + exportMP4(fin); }
            catch (e9) { exportMsg = "\n\nExport failed: " + e9.toString() + "\nRender the comp from the Render Queue."; }
        }

        var counts = [];
        for (var c2 = 1; c2 < ROLES.length; c2++) {
            if (by[ROLES[c2].id].length) counts.push(ROLES[c2].label + ": " + by[ROLES[c2].id].length);
        }
        alert("Done!\n\n" + counts.join("\n") +
            "\n\nTweak the wiggle on the \"" + CONFIG.ctrlName + "\" null in \"" + root.name + "\"." + exportMsg);
    } catch (err) {
        alert("Madallal Post Animator error:\n" + err.toString() + (err.line ? "\nLine: " + err.line : ""));
    } finally {
        app.endUndoGroup();
    }
})();
