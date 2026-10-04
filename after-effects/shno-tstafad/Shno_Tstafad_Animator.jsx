/*
 * Post Animator - Alwatani / Earthlink brand versions (After Effects ExtendScript)
 * ------------------------------------------------------------------------------
 * Post: "Shno elli tstafad minna akthar" (default PSD in CONFIG.psdName)
 * 1080 x 1350, 30 fps, 10 s.
 *
 * Story (this post: robot mascot + phone, no chair):
 *   1. Background push-in, Alwatani / Earthlink logo drops in
 *   2. Robot flies in from bottom-left, lands with a bounce, then hovers;
 *      its eyes blink (if the eyes are a separate layer)
 *   3. Phone pops out of the robot's hand
 *   4. Headline wipes in RTL line by line, the yellow word pops
 *   5. Stickers burst out of the robot (left side) and the phone (right
 *      side / bottom) on an arc, then wiggle until the end
 *   6. Footer slides up, light sweeps over the headline
 *
 * - Imports the layered PSD and auto-detects a role for every layer
 *   (background, logo, headline, main subject, pop elements, footer...)
 *   and a brand tag (All / Alwatani only / Earthlink only). Both are
 *   reviewable in a dialog before anything is built.
 * - Builds the animation once: pop-up elements with continuous wiggle,
 *   main subject pop, RTL headline wipe, footer, light sweeps.
 * - Makes two versions from it: Alwatani and Earthlink. Brand-only layers
 *   are switched per version; if the PSD has no Earthlink logo you can pick
 *   a logo file and it is placed and animated automatically.
 * - Earthlink theme: the Earthlink logo and background can be pulled from
 *   another PSD in the same folder (picked in the dialog); the layers found
 *   there are copied into the Earthlink version only.
 * - Starts a NEW After Effects project (the open one is closed, with a
 *   prompt to save it if it has changes), saves <projectName>.aep in
 *   CONFIG.projectFolder and renders both MP4s into <projectFolder>\render.
 *
 * Usage: File > Scripts > Run Script File... > this file.
 */

(function PostAnimatorBrands() {

    // ------------------------------------------------------------------
    // CONFIG
    // ------------------------------------------------------------------
    var CONFIG = {
        // Project folder: the .aep and the .mp4 are saved here, next to the PSD
        projectFolder: "D:\\2026\\\u062a\u062d\u0631\u064a\u0643 \u0628\u0648\u0633\u062a\u0627\u062a\\\u062a\u062d\u0631\u064a\u0643 \u0628\u0648\u0633\u062a \u062c\u062f\u064a\u062f",
        psdName: "\u0634\u0646\u0648 \u0627\u0644\u064a \u062a\u0633\u062a\u0641\u0627\u062f \u0645\u0646\u0647 \u0627\u0643\u062b\u0631.psd",
        projectName: "Shno_Tstafad_Animation",
        // MP4s go to <projectFolder>\<renderFolderName> (created if missing)
        renderFolderName: "render",
        // Final comps / MP4s: <baseName>_Alwatani_1080x1350(.mp4) and _Earthlink_
        baseName: "Shno_Tstafad",
        // Where a picked Earthlink logo file goes: "top-left", "top-right" or "same"
        // ("same" = exactly where the Alwatani logo is)
        earthlinkLogoPos: "top-left",
        // Optional Earthlink background recolour (Tint effect), 0..1 RGB
        earthlinkTintDark: [0.0, 0.22, 0.45],
        earthlinkTintLight: [0.62, 0.92, 1.0],
        earthlinkTintAmount: 65,
        // Headline words that get the "accent" pop (the yellow word)
        accentWords: ["\u062a\u0633\u062a\u0641\u0627\u062f"],
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

    // Used instead of the chair timings when the PSD has no chair
    // (mascot enters first, phone pops from its hand, everything earlier).
    var TIMING_NO_CHAIR = {
        person: 0.4, phone: 0.95, glow: 1.25, phoneUI: 1.3,
        headline: 1.15, accent: 1.75, elements: 1.6, footer: 2.5
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
        { id: "HEADLINE_ACCENT", label: "Headline accent (coloured word)" },
        { id: "CHAIR",           label: "Chair" },
        { id: "PHONE",           label: "Phone" },
        { id: "PHONE_GLOW",      label: "Phone neon glow / frame" },
        { id: "PHONE_UI",        label: "Phone screen UI item" },
        { id: "PERSON",          label: "Character / main subject" },
        { id: "ELEMENT",         label: "Pop element + wiggle" },
        { id: "COIN",            label: "Coin element (pop + flip)" },
        { id: "EYES",            label: "Eyes (blink)" },
        { id: "FOOTER",          label: "Footer item" },
        { id: "SWOOSH",          label: "Footer swoosh line" },
        { id: "FADE",            label: "Generic fade-in" }
    ];

    var BRANDS = [
        { id: "ALL",       label: "All versions" },
        { id: "ALWATANI",  label: "Alwatani only" },
        { id: "EARTHLINK", label: "Earthlink only" }
    ];

    function brandIndex(id) {
        for (var i = 0; i < BRANDS.length; i++) if (BRANDS[i].id === id) return i;
        return 0;
    }

    function brandOf(name) {
        var n = String(name).toLowerCase();
        if (/alwatani|al watani|watani|\u0627\u0644\u0648\u0637\u0646\u064a|\u0648\u0637\u0646\u064a/.test(n)) return "ALWATANI";
        if (/earthlink|earth link|\u0627\u064a\u0631\u062b\u0644\u0646\u0643|\u0625\u064a\u0631\u062b\u0644\u0646\u0643|\u0627\u064a\u0631\u062b \u0644\u0646\u0643|\u0627\u0631\u062b\u0644\u0646\u0643/.test(n)) return "EARTHLINK";
        return "ALL";
    }

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
        var f = new File(CONFIG.projectFolder + "\\" + CONFIG.psdName);
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
                name: L.name, rect: null, role: "IGNORE",
                brand: (parentItem && parentItem.brand !== "ALL") ? "ALL" : brandOf(L.name)
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

        // Hidden brand layers (e.g. a hidden Earthlink logo) still get animated
        if (!L.enabled && brandOf(item.name) === "ALL") return "IGNORE";
        // Eyes blink even when they live inside the animated robot group
        if (L.enabled && has(/\beyes?\b|\u0639\u064a\u0646|\u0639\u064a\u0648\u0646/)) return "EYES";
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
        if (has(/robot|mascot|bot\b|\u0631\u0648\u0628\u0648\u062a|\u0631\u0628\u0648\u062a|girl|woman|model|person|character|\u0628\u0646\u062a|\u0641\u062a\u0627\u0629|\u0634\u062e\u0635\u064a|\u0645\u0648\u062f\u064a\u0644|\u0627\u0645\u0631\u0623\u0629|\u0645\u0631\u0623\u0629|\u0641\u062a\u0627\u0647/)) return "PERSON";
        if (has(/swoosh|wave|curve|\u0645\u0648\u062c\u0629|\u0645\u0646\u062d\u0646\u0649/)) return "SWOOSH";
        if (has(/itpc|6119|\u0627\u062a\u0635\u0644|\u0648\u0632\u0627\u0631\u0629|\u062a\u0639\u062a\u0645\u062f/)) return "FOOTER";
        if (has(/logo|\u0644\u0648\u062c\u0648|\u0644\u0648\u063a\u0648|\u0634\u0639\u0627\u0631|\u0627\u0644\u0648\u0637\u0646\u064a|\u0627\u064a\u0631\u062b\u0644\u0646\u0643|earthlink/)) return r.cy > H * 0.8 ? "FOOTER" : "LOGO";
        if (has(/screen|\u0634\u0627\u0634\u0629|\bui\b|\u0648\u0627\u062c\u0647\u0629|\u062a\u0637\u0628\u064a\u0642|\bapp\b/)) return "PHONE_UI";


        if (partlyOff && r.w < W * 0.5 && r.h < H * 0.5) return "BG_FLOAT";

        var small = r.w < W * 0.3 && r.h < H * 0.25;

        // Bottom strip: footer, except a sticker sitting in the middle (the burger)
        if (r.cy > H * 0.87) return (small && r.cx > W * 0.38 && r.cx < W * 0.62 && r.cy < H * 0.97) ? "ELEMENT" : "FOOTER";
        if (r.cy < H * 0.13) return "LOGO";
        if (r.cy < H * 0.26) {
            for (var aw = 0; aw < CONFIG.accentWords.length; aw++) {
                if (n.indexOf(CONFIG.accentWords[aw]) >= 0) return "HEADLINE_ACCENT";
            }
            return "HEADLINE";
        }

        var side = r.cx < W * 0.4 || r.cx > W * 0.6;
        if (isCoin && small) return "COIN";
        if (small && side && r.cy > H * 0.22) return "ELEMENT";

        if (r.h > H * 0.4 && r.w > W * 0.3) {
            if (r.b > H * 0.9 && r.w > W * 0.42 && r.cx > W * 0.4 && r.cx < W * 0.6) return "CHAIR";
            if (r.cx < W * 0.47) return "PERSON";     // big thing on the left = mascot / character
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

        var blabels = [];
        for (var bi = 0; bi < BRANDS.length; bi++) blabels.push(BRANDS[bi].label);

        var w = new Window("dialog", "Post Animator - Alwatani / Earthlink");
        w.orientation = "column";
        w.alignChildren = ["fill", "top"];
        w.add("statictext", undefined, "Comp: " + compName);
        w.add("statictext", undefined,
            "Roles and brands were auto-detected. Select layer(s), pick a role / brand and press Assign.");

        var lb = w.add("listbox", [0, 0, 820, 440], [], {
            numberOfColumns: 4, showHeaders: true,
            columnTitles: ["#", "Layer", "Role", "Brand"], columnWidths: [40, 400, 220, 140],
            multiselect: true
        });
        for (var j = 0; j < items.length; j++) {
            var indent = "";
            for (var d = 0; d < items[j].depth; d++) indent += "    ";
            var li = lb.add("item", String(j + 1));
            li.subItems[0].text = indent + (items[j].depth ? "> " : "") + items[j].name;
            li.subItems[1].text = ROLES[roleIndex(items[j].role)].label;
            li.subItems[2].text = BRANDS[brandIndex(items[j].brand)].label;
        }

        var g = w.add("group");
        g.add("statictext", undefined, "Role:");
        var dd = g.add("dropdownlist", undefined, labels);
        dd.selection = 0;
        var assign = g.add("button", undefined, "Assign role");
        g.add("statictext", undefined, "   Brand:");
        var bd = g.add("dropdownlist", undefined, blabels);
        bd.selection = 0;
        var assignB = g.add("button", undefined, "Assign brand");

        lb.onChange = function () {
            var s = lb.selection;
            if (s && !(s instanceof Array)) s = [s];
            if (s && s.length) {
                dd.selection = roleIndex(items[s[0].index].role);
                bd.selection = brandIndex(items[s[0].index].brand);
            }
        };
        assignB.onClick = function () {
            var s = lb.selection;
            if (!s || !bd.selection) return;
            if (!(s instanceof Array)) s = [s];
            for (var k = 0; k < s.length; k++) {
                items[s[k].index].brand = BRANDS[bd.selection.index].id;
                s[k].subItems[2].text = BRANDS[bd.selection.index].label;
            }
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

        var bp = w.add("panel", undefined, "Brand versions");
        bp.orientation = "column";
        bp.alignChildren = ["left", "top"];
        var g1 = bp.add("group");
        g1.add("statictext", undefined, "Export:");
        var ver = g1.add("dropdownlist", undefined, ["Alwatani + Earthlink", "Alwatani only", "Earthlink only"]);
        ver.selection = 0;
        // Earthlink theme PSD (logo + background) from the same folder
        var gT = bp.add("group");
        gT.add("statictext", undefined, "Earthlink theme from PSD:");
        var psds = [], pnames = ["(none)"];
        try {
            var all = projectFolder().getFiles("*.psd");
            for (var pf = 0; pf < all.length; pf++) {
                if (!(all[pf] instanceof File)) continue;
                if (decodeURI(all[pf].name) === CONFIG.psdName) continue;
                psds.push(all[pf]); pnames.push(decodeURI(all[pf].name));
            }
        } catch (ef) {}
        var themeDD = gT.add("dropdownlist", undefined, pnames);
        themeDD.preferredSize.width = 330;
        var pick = 0;
        for (var pp = 0; pp < psds.length; pp++) if (brandOf(decodeURI(psds[pp].name)) === "EARTHLINK") { pick = pp + 1; break; }
        if (!pick) for (var pq = 0; pq < psds.length; pq++) if (/\u0645\u062f\u0644\u0644/.test(decodeURI(psds[pq].name))) { pick = pq + 1; break; }
        if (!pick && psds.length) pick = 1;
        themeDD.selection = pick;
        var themeBrowse = gT.add("button", undefined, "Other...");
        themeBrowse.onClick = function () {
            var f = File.openDialog("PSD with the Earthlink logo / background", "*.psd");
            if (f) { psds.push(f); themeDD.add("item", decodeURI(f.name)); themeDD.selection = psds.length; }
        };

        var g2 = bp.add("group");
        g2.add("statictext", undefined, "Earthlink logo file (if neither PSD has one):");
        var logoTxt = g2.add("edittext", undefined, "", { readonly: true });
        logoTxt.characters = 34;
        var browse = g2.add("button", undefined, "Browse...");
        var logoFile = null;
        browse.onClick = function () {
            var f = File.openDialog("Earthlink logo (PNG / PSD / AI)", "*.png;*.psd;*.ai;*.svg;*.jpg");
            if (f) { logoFile = f; logoTxt.text = f.displayName; }
        };
        var g3 = bp.add("group");
        g3.add("statictext", undefined, "Logo position:");
        var posDD = g3.add("dropdownlist", undefined, ["Top-left", "Top-right", "Same as Alwatani logo"]);
        posDD.selection = CONFIG.earthlinkLogoPos === "top-right" ? 1 : (CONFIG.earthlinkLogoPos === "same" ? 2 : 0);
        var cbTint = bp.add("checkbox", undefined, "Recolour background to lighter Earthlink blue (Tint)");
        cbTint.value = false;

        var b = w.add("group");
        b.alignment = "right";
        b.add("button", undefined, "Cancel", { name: "cancel" });
        b.add("button", undefined, "Build Animation", { name: "ok" });

        if (w.show() !== 1) return null;
        return {
            motionBlur: cbMB.value, exportMP4: cbMP4.value,
            alwatani: ver.selection.index !== 2, earthlink: ver.selection.index !== 1,
            logoFile: logoFile, logoPos: ["top-left", "top-right", "same"][posDD.selection.index],
            tint: cbTint.value,
            themeFile: (themeDD.selection && themeDD.selection.index > 0) ? psds[themeDD.selection.index - 1] : null
        };
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
    // Where each sticker is "born": the chair for low ones (if there is a
    // chair), otherwise whichever of character / phone is closer sideways.
    // The start point sits inside that object, at the sticker's height.
    function emitterFor(r, scene, W) {
        var src;
        if (scene.hasChair && r.cy >= scene.chair.t + 100 * U) src = scene.chair;
        else if (!scene.hasPerson) src = scene.phone;
        else if (!scene.hasPhone) src = scene.person;
        else src = Math.abs(r.cx - scene.person.cx) < Math.abs(r.cx - scene.phone.cx) ? scene.person : scene.phone;
        var x = clamp(r.cx, src.l + src.w * 0.25, src.r - src.w * 0.25);
        var y = clamp(r.cy, src.t + src.h * 0.15, src.b - src.h * 0.15);
        return [lerp(x, src.cx, 0.5), lerp(y, src.cy, 0.4)];
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

    // Mascot entrance (no chair): flies in from bottom-left, lands, hovers.
    function animMascot(it, pivot) {
        var L = it.layer, t = TIMING.person;
        setAnchorToCompPoint(L, rootToLocal(it, pivot));
        var p = vec2(pPos(L)), d = 1 / it.xf.s;
        K(pPos(L), [t, t + 0.45, t + 0.62, t + 0.8],
            [[p[0] - 260 * U * d, p[1] + 520 * U * d], [p[0] + 10 * U * d, p[1] - 30 * U * d], [p[0], p[1] + 8 * U * d], p]);
        K(pRot(L), [t, t + 0.45, t + 0.7], [-18, 4, 0]);
        K(pScl(L), [t, t + 0.45, t + 0.62, t + 0.8], [[80, 80], [102, 106], [104, 96], [100, 100]]);
        K(pOpa(L), [t, t + 0.12], [0, 100]);
        var t0 = (t + 0.8).toFixed(3);
        addExpr(pPos(L), "var t0 = " + t0 + ";\nvar r = ease(time, t0, t0 + 0.8, 0, 1);\n" +
            "value + [0, Math.sin((time - t0) * 2.4) * " + (10 * U * d).toFixed(2) + " * r];");
        addExpr(pRot(L), "var t0 = " + t0 + ";\nvar r = ease(time, t0, t0 + 0.8, 0, 1);\n" +
            "value + Math.sin((time - t0) * 1.2 + 1) * 1.5 * r;");
    }

    // Phone pops out of the mascot's hand (pivot = lower-left of the phone).
    function animPhoneFromHand(it, pivot, t) {
        var L = it.layer;
        setAnchorToCompPoint(L, rootToLocal(it, pivot));
        K(pScl(L), [t, t + 0.35, t + 0.5, t + 0.65], [[0, 0], [107, 107], [97, 97], [100, 100]]);
        K(pRot(L), [t, t + 0.35, t + 0.6], [14, -3, 0]);
        K(pOpa(L), [t, t + 0.08], [0, 100]);
    }

    // Eyes: pop on with the mascot, then blink (squash Y) every ~3 s.
    function animEyes(it, t) {
        var L = it.layer, r = it.rect;
        setAnchorToCompPoint(L, rootToLocal(it, [r.cx, r.cy]));
        var t0 = (t + 1.0).toFixed(3);
        addExpr(pScl(L), "var t0 = " + t0 + ";\nvar v = value;\n" +
            "if (time > t0) {\n  var lt = (time - t0) % 3.2;\n" +
            "  if (lt < 0.16) v[1] = v[1] * (1 - 0.9 * Math.sin(lt / 0.16 * Math.PI));\n}\nv;");
        addExpr(pOpa(L), "var t0 = " + t0 + ";\nvalue * (0.85 + 0.15 * Math.sin(time * 3));");
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
        setAnchorToCompPoint(L, rootToLocal(it, [r.cx, r.cy]));
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
    function projectFolder() {
        if (OUTPUT_FOLDER && OUTPUT_FOLDER.exists) return OUTPUT_FOLDER;
        var f = new Folder(CONFIG.projectFolder);
        if (f.exists) return f;
        return app.project.file ? app.project.file.parent : Folder.desktop;
    }

    // Next free name: name.ext, name_v2.ext, name_v3.ext ... (never overwrites)
    function freeFile(folder, base, ext) {
        var f = new File(folder.fsName + "/" + base + ext), v = 2;
        while (f.exists) { f = new File(folder.fsName + "/" + base + "_v" + v + ext); v++; }
        return f;
    }

    function saveProject() {
        var f = freeFile(projectFolder(), CONFIG.projectName, ".aep");
        app.project.save(f);
        return f;
    }

    // jobs: [{comp, name}] -> renders every comp to <name>.mp4 in one pass.
    function renderFolder() {
        var f = new Folder(projectFolder().fsName + "/" + CONFIG.renderFolderName);
        if (!f.exists) f.create();
        return f.exists ? f : projectFolder();
    }

    function exportMP4s(jobs) {
        var folder = renderFolder();
        var rq = app.project.renderQueue;
        for (var q = 1; q <= rq.numItems; q++) {
            try { if (rq.item(q).status === RQItemStatus.QUEUED) rq.item(q).render = false; } catch (e) {}
        }
        var outs = [], useAME = false;
        for (var i = 0; i < jobs.length; i++) {
            var item = rq.items.add(jobs[i].comp);
            try {
                var rs = findTemplate(item.templates, [/^Best Settings$/i, /best/i]);
                if (rs) item.applyTemplate(rs);
            } catch (e0) {}
            var om = item.outputModule(1);
            var h264 = null;
            try { h264 = findTemplate(om.templates, [/H\.264.*Match Render Settings.*15/i, /H\.264/i]); } catch (e1) {}
            var out = freeFile(folder, jobs[i].name, ".mp4");
            if (h264) {
                om.applyTemplate(h264);
                om.file = out;
            } else {
                useAME = true;
                om.file = new File(out.fsName.replace(/\.mp4$/i, ".mov"));
            }
            outs.push(out.fsName);
        }

        if (!useAME) {
            rq.render();
            return "MP4 exported:\n" + outs.join("\n");
        }
        // Older AE: hand over to Media Encoder (reads the saved project)
        app.project.save();
        if (rq.canQueueInAME) {
            rq.queueInAME(true);
            return "Sent to Adobe Media Encoder. Choose the H.264 preset there if it is not selected.\n" +
                "Output folder: " + folder.fsName;
        }
        return "No H.264 template found and Media Encoder is not available.\n" +
            "The comps are in the Render Queue; render them manually.";
    }

    // ------------------------------------------------------------------
    // BRAND VERSIONS
    // ------------------------------------------------------------------
    // The same layer inside the Earthlink copy of the root comp. Group comps on
    // the way down are duplicated once, so edits never touch the Alwatani version.
    function layerInVariant(item, variantRoot, cache) {
        var chain = [], it = item;
        while (it) { chain.unshift(it); it = it.parent; }
        var comp = variantRoot, key = "";
        for (var i = 0; i < chain.length; i++) {
            var L = comp.layer(chain[i].layer.index);
            if (i === chain.length - 1) return L;
            key += "/" + chain[i].layer.index;
            if (!cache[key]) {
                var dup = L.source.duplicate();
                dup.name = L.source.name + " (Earthlink)";
                L.replaceSource(dup, false);
                cache[key] = dup;
            }
            comp = cache[key];
        }
        return null;
    }

    // ------------------------------------------------------------------
    // EARTHLINK THEME FROM ANOTHER PSD
    // ------------------------------------------------------------------
    function effBrand(it) {
        while (it) { if (brandOf(it.name) !== "ALL") return brandOf(it.name); it = it.parent; }
        return "ALL";
    }

    function isAncestor(a, it) {
        for (var u = it.parent; u; u = u.parent) if (u === a) return true;
        return false;
    }

    // Imports the theme PSD and returns {comp, logo:[items], bg:[items]}
    // after the user confirmed the auto-picked layers.
    function loadTheme(file) {
        var io = new ImportOptions(file);
        io.importAs = io.canImportAs(ImportAsType.COMP_CROPPED_LAYERS) ? ImportAsType.COMP_CROPPED_LAYERS : ImportAsType.COMP;
        var tc = app.project.importFile(io);
        if (!(tc instanceof CompItem)) return null;
        prepComp(tc, {});
        var TW = tc.width, TH = tc.height;
        var ti = [];
        collect(tc, { s: 1, ox: 0, oy: 0 }, 0, null, ti);

        var anyEarth = false;
        for (var i = 0; i < ti.length; i++) { ti[i].eb = effBrand(ti[i]); ti[i].use = "-"; if (ti[i].eb === "EARTHLINK") anyEarth = true; }

        // Logo: Earthlink layer near the top (or any logo-named layer if the
        // PSD has no Earthlink tags at all); shallowest, topmost wins.
        var logo = null;
        for (var a = 0; a < ti.length; a++) {
            var r = ti[a].rect, full = r.w >= TW * 0.9 && r.h >= TH * 0.9;
            var okBrand = anyEarth ? ti[a].eb === "EARTHLINK" : /logo|\u0644\u0648\u062c\u0648|\u0644\u0648\u06af\u0648|\u0644\u0648\u063a\u0648|\u0634\u0639\u0627\u0631/i.test(ti[a].name);
            if (!okBrand || full || r.cy > TH * 0.22 || r.w > TW * 0.6) continue;
            if (!logo || ti[a].depth < logo.depth) logo = ti[a];
        }
        if (logo) logo.use = "LOGO";

        // Background: full-frame Earthlink layers, deepest ones only
        var cands = [];
        for (var b = 0; b < ti.length; b++) {
            var rb = ti[b].rect;
            if (!(rb.w >= TW * 0.9 && rb.h >= TH * 0.9)) continue;
            if (anyEarth ? ti[b].eb !== "EARTHLINK" : !/\bbg\b|background|\u062e\u0644\u0641\u064a|\u062e\u0644\u0641\u064a\u0629/i.test(ti[b].name)) continue;
            cands.push(ti[b]);
        }
        if (!anyEarth && !cands.length) {
            for (var c = ti.length - 1; c >= 0; c--) {
                var rc = ti[c].rect;
                if (ti[c].depth === 0 && rc.w >= TW * 0.9 && rc.h >= TH * 0.9) { cands.push(ti[c]); break; }
            }
        }
        for (var d = 0; d < cands.length; d++) {
            var parentOfOther = logo && isAncestor(cands[d], logo);
            for (var e = 0; e < cands.length && !parentOfOther; e++) if (e !== d && isAncestor(cands[d], cands[e])) parentOfOther = true;
            if (!parentOfOther) cands[d].use = "BG";
        }

        var USES = [["-", "- (not used)"], ["LOGO", "Earthlink logo"], ["BG", "Earthlink background"]];
        var useIdx = function (id) { for (var q = 0; q < USES.length; q++) if (USES[q][0] === id) return q; return 0; };
        var w = new Window("dialog", "Earthlink theme - " + decodeURI(file.name));
        w.orientation = "column"; w.alignChildren = ["fill", "top"];
        w.add("statictext", undefined, "Layers copied into the Earthlink version. Check the picks, change with Assign.");
        var lb = w.add("listbox", [0, 0, 700, 380], [], {
            numberOfColumns: 3, showHeaders: true, columnTitles: ["#", "Layer", "Use as"],
            columnWidths: [40, 440, 200], multiselect: true
        });
        for (var j = 0; j < ti.length; j++) {
            var ind = "";
            for (var k = 0; k < ti[j].depth; k++) ind += "    ";
            var li = lb.add("item", String(j + 1));
            li.subItems[0].text = ind + (ti[j].depth ? "> " : "") + ti[j].name;
            li.subItems[1].text = USES[useIdx(ti[j].use)][1];
        }
        var g = w.add("group");
        var labels = [];
        for (var q2 = 0; q2 < USES.length; q2++) labels.push(USES[q2][1]);
        var dd = g.add("dropdownlist", undefined, labels);
        dd.selection = 0;
        var asg = g.add("button", undefined, "Assign");
        asg.onClick = function () {
            var sel = lb.selection;
            if (!sel || !dd.selection) return;
            if (!(sel instanceof Array)) sel = [sel];
            for (var m = 0; m < sel.length; m++) {
                ti[sel[m].index].use = USES[dd.selection.index][0];
                sel[m].subItems[1].text = USES[dd.selection.index][1];
            }
        };
        var bb = w.add("group");
        bb.alignment = "right";
        bb.add("button", undefined, "Skip theme", { name: "cancel" });
        bb.add("button", undefined, "Use theme", { name: "ok" });
        if (w.show() !== 1) return null;

        var out = { comp: tc, logo: [], bg: [] };
        for (var n2 = 0; n2 < ti.length; n2++) {
            if (ti[n2].use === "LOGO") out.logo.push(ti[n2]);
            if (ti[n2].use === "BG") out.bg.push(ti[n2]);
        }
        return out;
    }

    // Copy a theme layer into dest, keeping where it sits in the theme design
    // (nested group offsets and a different PSD size are compensated).
    function copyThemeLayer(item, dest, ratio) {
        item.layer.copyToComp(dest);
        var L = dest.layer(1);
        try { L.enabled = true; } catch (e0) {}
        var xf = item.xf, p = pPos(L).value, sc = pScl(L).value;
        pPos(L).setValue(fitv(pPos(L), [(xf.ox + xf.s * p[0]) * ratio, (xf.oy + xf.s * p[1]) * ratio]));
        pScl(L).setValue(fitv(pScl(L), [sc[0] * xf.s * ratio, sc[1] * xf.s * ratio]));
        try { L.inPoint = 0; L.outPoint = CONFIG.duration; } catch (e1) {}
        return L;
    }

    function makeFinal(src, name, motionBlur) {
        var fin = app.project.items.addComp(name, CONFIG.width, CONFIG.height, 1, CONFIG.duration, CONFIG.fps);
        fin.bgColor = [0.02, 0.18, 0.62];
        fin.motionBlur = motionBlur;
        var RL = fin.layers.add(src);
        var fit = Math.max(CONFIG.width / src.width, CONFIG.height / src.height) * 100;
        pScl(RL).setValue(fitv(pScl(RL), [fit, fit]));
        pPos(RL).setValue(fitv(pPos(RL), [CONFIG.width / 2, CONFIG.height / 2]));
        try { RL.collapseTransformation = true; } catch (e1) {}
        if (motionBlur) { try { RL.motionBlur = true; } catch (e2) {} }
        return fin;
    }

    // ------------------------------------------------------------------
    // MAIN
    // ------------------------------------------------------------------
    // Fresh project: close the open one (asks to save if it has changes)
    if (app.project) {
        if (!app.project.close(CloseOptions.PROMPT_TO_SAVE_CHANGES)) {
            alert("Cancelled - the current project was kept open.");
            return;
        }
    }
    if (!app.newProject()) { alert("Could not create a new After Effects project."); return; }

    app.beginUndoGroup("Post Animator - Brands");
    try {
        var root = importPSD();
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

        var theme = null;
        if (opts.earthlink && opts.themeFile) {
            try { theme = loadTheme(opts.themeFile); } catch (eth) { theme = null; }
        }

        // Scene rects (root space)
        // Missing pieces fall back to whatever exists, then to the frame centre,
        // so any layout works (no chair / no phone is fine).
        var rPhone = unionRect(items, "PHONE"), rChair = unionRect(items, "CHAIR"), rPerson = unionRect(items, "PERSON");
        var rCenter = fallbackRect(W * 0.3, H * 0.3, W * 0.7, H * 0.85);
        if (!rChair) { for (var tk in TIMING_NO_CHAIR) TIMING[tk] = TIMING_NO_CHAIR[tk]; }
        var scene = {
            hasChair: !!rChair, hasPhone: !!rPhone, hasPerson: !!rPerson,
            phone: rPhone || rPerson || rChair || rCenter,
            chair: rChair || rPhone || rPerson || rCenter,
            person: rPerson || rPhone || rChair || rCenter
        };
        var chairPivot = [scene.chair.cx, scene.chair.b];
        var phonePivot = [scene.phone.cx, scene.phone.b];
        var personPivot = [scene.person.cx, scene.person.t + scene.person.h * 0.92];
        var handPivot = [scene.phone.l + scene.phone.w * 0.15, scene.phone.b - scene.phone.h * 0.12];

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
        // Separate eye layers follow the robot they belong to
        for (var ey = 0; ey < by.EYES.length; ey++) {
            for (var pr = 0; pr < by.PERSON.length; pr++) {
                if (by.PERSON[pr].comp === by.EYES[ey].comp) {
                    setAnchorToCompPoint(by.EYES[ey].layer, rootToLocal(by.EYES[ey], [by.EYES[ey].rect.cx, by.EYES[ey].rect.cy]));
                    try { by.EYES[ey].layer.parent = by.PERSON[pr].layer; } catch (ep) {}
                    break;
                }
            }
        }
        var uiParented = [];
        for (var u1 = 0; u1 < by.PHONE_UI.length; u1++) uiParented.push(tryParent(by.PHONE_UI[u1]));

        var a;
        for (a = 0; a < by.BG.length; a++) animBG(by.BG[a]);
        for (a = 0; a < by.BG_FLOAT.length; a++) animBGFloat(by.BG_FLOAT[a], a);
        for (a = 0; a < by.LOGO.length; a++) animLogo(by.LOGO[a], a);
        for (a = 0; a < by.CHAIR.length; a++) animChair(by.CHAIR[a], chairPivot);
        for (a = 0; a < by.PHONE.length; a++) {
            if (rChair) animPhone(by.PHONE[a], phonePivot, TIMING.phone);
            else animPhoneFromHand(by.PHONE[a], handPivot, TIMING.phone);
        }
        for (a = 0; a < by.PHONE_GLOW.length; a++) animGlow(by.PHONE_GLOW[a], phonePivot, glowParented[a]);
        for (a = 0; a < by.PHONE_UI.length; a++) {
            if (!uiParented[a]) {
                // Not parented: grow with the phone, then cascade in
                setAnchorToCompPoint(by.PHONE_UI[a].layer, rootToLocal(by.PHONE_UI[a], phonePivot));
            }
            animPhoneUI(by.PHONE_UI[a], a);
        }
        for (a = 0; a < by.PERSON.length; a++) {
            if (rChair) animPerson(by.PERSON[a], personPivot);
            else animMascot(by.PERSON[a], personPivot);
        }
        for (a = 0; a < by.EYES.length; a++) animEyes(by.EYES[a], TIMING.person);
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

        // ---------------- Brand versions ----------------
        var finals = [];
        var brandNote = "";
        var hasEarthLayers = false;
        for (var e1 = 0; e1 < items.length; e1++) if (items[e1].brand === "EARTHLINK") hasEarthLayers = true;

        var rootE = null;
        if (opts.earthlink) {
            rootE = root.duplicate();
            rootE.name = CONFIG.baseName + "_PSD_Earthlink";
            var cache = {};
            for (var e2 = 0; e2 < items.length; e2++) {
                var bit = items[e2];
                if (bit.brand === "ALL" && !(opts.tint && bit.role === "BG")) continue;
                var VL = layerInVariant(bit, rootE, cache);
                if (!VL) continue;
                if (bit.brand === "ALWATANI") VL.enabled = false;
                if (bit.brand === "EARTHLINK") VL.enabled = true;
                if (opts.tint && bit.role === "BG") {
                    try {
                        var tf = VL.property("ADBE Effect Parade").addProperty("ADBE Tint");
                        var dk = CONFIG.earthlinkTintDark, lt = CONFIG.earthlinkTintLight;
                        tf.property("ADBE Tint-0001").setValue([dk[0], dk[1], dk[2], 1]);
                        tf.property("ADBE Tint-0002").setValue([lt[0], lt[1], lt[2], 1]);
                        tf.property("ADBE Tint-0003").setValue(CONFIG.earthlinkTintAmount);
                    } catch (et) {}
                }
            }

            // Earthlink theme from the other PSD
            var themeLogo = false;
            if (theme) {
                var ratio = rootE.width / theme.comp.width;
                if (theme.bg.length) {
                    for (var t1 = 0; t1 < items.length; t1++) {
                        if (items[t1].role !== "BG") continue;
                        var ob = layerInVariant(items[t1], rootE, cache);
                        if (ob) ob.enabled = false;
                    }
                    // keep the theme's own stacking: copy bottom-most first
                    for (var t2 = theme.bg.length - 1; t2 >= 0; t2--) {
                        var BL = copyThemeLayer(theme.bg[t2], rootE, ratio);
                        BL.moveToEnd();
                        BL.name = "Earthlink BG - " + theme.bg[t2].name;
                        animBG({ layer: BL, comp: rootE, xf: { s: 1, ox: 0, oy: 0 } });
                    }
                }
                for (var t3 = theme.logo.length - 1; t3 >= 0; t3--) {
                    var TL = copyThemeLayer(theme.logo[t3], rootE, ratio);
                    TL.name = "Earthlink Logo - " + theme.logo[t3].name;
                    animLogo({ layer: TL }, 0);
                    if (opts.motionBlur) { try { TL.motionBlur = true; } catch (em) {} }
                    themeLogo = true;
                }
                // Theme logo replaces any Earthlink logo inside the main PSD
                if (themeLogo) {
                    for (var t4 = 0; t4 < items.length; t4++) {
                        if (items[t4].brand === "EARTHLINK" && items[t4].role === "LOGO") {
                            var oe = layerInVariant(items[t4], rootE, cache);
                            if (oe) oe.enabled = false;
                        }
                    }
                }
                brandNote += "\n\nEarthlink theme from: " + decodeURI(opts.themeFile.name) +
                    "\n  logo layers: " + theme.logo.length + ", background layers: " + theme.bg.length;
            }

            // No Earthlink logo anywhere: place the picked logo file
            if (!themeLogo && !hasEarthLayers && opts.logoFile) {
                var ref = null;
                for (var e3 = 0; e3 < items.length; e3++) {
                    if (items[e3].role === "LOGO" && items[e3].brand === "ALWATANI") ref = ref || items[e3];
                }
                if (!ref) for (var e4 = 0; e4 < items.length; e4++) if (items[e4].role === "LOGO") ref = ref || items[e4];
                var rr = ref ? ref.rect : fallbackRect(780 * U, 70 * U, 1030 * U, 140 * U);
                var foot = app.project.importFile(new ImportOptions(opts.logoFile));
                var LL = rootE.layers.add(foot);
                LL.moveToBeginning();
                LL.name = "Earthlink Logo";
                var src = LL.sourceRectAtTime(0, false);
                var k2 = Math.min(rr.h / src.height, (W * 0.42) / src.width) * 100;
                pScl(LL).setValue(fitv(pScl(LL), [k2, k2]));
                var lw = src.width * k2 / 100;
                var margin = Math.max(W - rr.r, 30 * U);
                var lx = opts.logoPos === "same" ? rr.cx :
                    (opts.logoPos === "top-right" ? W - margin - lw / 2 : margin + lw / 2);
                pPos(LL).setValue(fitv(pPos(LL), [lx, rr.cy]));
                LL.outPoint = CONFIG.duration;
                animLogo({ layer: LL }, 0);
                if (opts.motionBlur) { try { LL.motionBlur = true; } catch (eb) {} }
            } else if (!themeLogo && !hasEarthLayers) {
                brandNote += "\n\nNote: no Earthlink layer was found and no logo file was picked -\n" +
                    "the Earthlink version has the Alwatani-only layers hidden and no Earthlink logo.";
            }
        }
        // Alwatani version: hide Earthlink-only layers
        for (var e5 = 0; e5 < items.length; e5++) {
            if (items[e5].brand === "EARTHLINK") { try { items[e5].layer.enabled = false; } catch (eh) {} }
        }

        if (opts.alwatani) finals.push({ comp: makeFinal(root, CONFIG.baseName + "_Alwatani_1080x1350", opts.motionBlur),
            name: CONFIG.baseName + "_Alwatani_1080x1350" });
        if (rootE) finals.push({ comp: makeFinal(rootE, CONFIG.baseName + "_Earthlink_1080x1350", opts.motionBlur),
            name: CONFIG.baseName + "_Earthlink_1080x1350" });

        // SFX sync markers
        for (var fm = 0; fm < finals.length; fm++) {
            try {
                var mk = finals[fm].comp.markerProperty;
                var mark = function (tm, txt) { mk.setValueAtTime(tm, new MarkerValue(txt)); };
                if (by.CHAIR.length) { mark(TIMING.chair, "SFX: whoosh up"); mark(TIMING.chair + 0.62, "SFX: soft thump"); }
                if (by.PHONE.length) mark(TIMING.phone, "SFX: rise / swell (phone)");
                if (by.PHONE_GLOW.length) mark(TIMING.glow, "SFX: neon buzz");
                if (by.PERSON.length) mark(TIMING.person, rChair ? "SFX: pop (main subject)" : "SFX: whoosh + landing (robot)");
                if (by.HEADLINE.length) mark(TIMING.headline, "SFX: swipe (headline)");
                for (var pm = 0; pm < popTimes.length; pm++) mark(popTimes[pm], "SFX: pop " + (pm + 1));
                if (by.FOOTER.length) mark(TIMING.footer, "SFX: soft whoosh (footer)");
                for (var sh = 0; sh < TIMING.shines.length; sh++) mark(TIMING.shines[sh], "SFX: shimmer");
            } catch (e8) {}
        }
        if (finals.length) finals[0].comp.openInViewer();

        var exportMsg = brandNote;
        try { exportMsg += "\n\nProject saved:\n" + saveProject().fsName; }
        catch (e10) { exportMsg += "\n\nCould not save the project: " + e10.toString(); }
        if (opts.exportMP4 && finals.length) {
            try { exportMsg += "\n\n" + exportMP4s(finals); }
            catch (e9) { exportMsg += "\n\nExport failed: " + e9.toString() + "\nRender the comps from the Render Queue."; }
        }

        var counts = [];
        for (var c2 = 1; c2 < ROLES.length; c2++) {
            if (by[ROLES[c2].id].length) counts.push(ROLES[c2].label + ": " + by[ROLES[c2].id].length);
        }
        alert("Done!\n\n" + counts.join("\n") +
            "\n\nTweak the wiggle on the \"" + CONFIG.ctrlName + "\" null in \"" + root.name + "\"." + exportMsg);
    } catch (err) {
        alert("Post Animator error:\n" + err.toString() + (err.line ? "\nLine: " + err.line : ""));
    } finally {
        app.endUndoGroup();
    }
})();
