const PRIZE_TABLE = Object.freeze({
    first: { label: "1等", amount: "7億円", group: 22, number: 146504 },
    firstAdjacent: { label: "1等の前後賞", amount: "1.5億円" },
    firstDifferentGroup: { label: "1等の組違い賞", amount: "10万円", number: 146504, group: 22 },
    second: { label: "2等", amount: "1億円", group: 43, number: 127948 },
    third: {
        label: "3等",
        amount: "1000万円",
        winners: [
            { group: 117, number: 172316 },
            { group: 12, number: 102159 },
            { group: 116, number: 148147 },
            { group: 171, number: 174097 },
        ],
    },
    fourth: {
        label: "4等",
        amount: "100万円",
        winners: [
            { groupLastDigit: 7, number: 114925 },
            { groupLastDigit: 2, number: 182568 },
        ],
    },
    fifth: { label: "5等", amount: "1万円", last3: [345, 819, 350] },
    sixth: { label: "6等", amount: "3000円", last2: [2] }, // 02
    seventh: { label: "7等", amount: "300円", last1: [0] },
});

function normalizeDigits(value) {
    const halfWidth = String(value)
        .replace(/[０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))
        .replace(/[^0-9]/g, "")
        .trim();
    return halfWidth;
}

function parseGroupAndNumber({ groupText, numberText }) {
    const groupDigits = normalizeDigits(groupText);
    const numberDigits = normalizeDigits(numberText);

    if (!groupDigits || !numberDigits) {
        return { ok: false, message: "組と番号を入力してください。" };
    }

    const group = Number.parseInt(groupDigits, 10);
    const number = Number.parseInt(numberDigits, 10);

    if (!Number.isFinite(group) || !Number.isFinite(number)) {
        return { ok: false, message: "組/番号が数字として解釈できませんでした。" };
    }

    if (group <= 0 || group > 999) {
        return { ok: false, message: "組は1〜999の範囲で入力してください。" };
    }

    if (numberDigits.length !== 6) {
        return { ok: false, message: "番号は6桁で入力してください。" };
    }

    if (number < 0 || number > 999999) {
        return { ok: false, message: "番号は000000〜999999の範囲で入力してください。" };
    }

    return { ok: true, group, number, groupDigits, numberDigits };
}

function checkPrize(group, number) {
    const n = number;
    const g = group;

    // 1等
    if (g === PRIZE_TABLE.first.group && n === PRIZE_TABLE.first.number) {
        return { rank: PRIZE_TABLE.first.label, amount: PRIZE_TABLE.first.amount };
    }

    // 1等 前後賞（同組で±1）
    if (g === PRIZE_TABLE.first.group && (n === PRIZE_TABLE.first.number - 1 || n === PRIZE_TABLE.first.number + 1)) {
        return { rank: PRIZE_TABLE.firstAdjacent.label, amount: PRIZE_TABLE.firstAdjacent.amount };
    }

    // 1等 組違い賞（同番号で組が違う）
    if (n === PRIZE_TABLE.firstDifferentGroup.number && g !== PRIZE_TABLE.firstDifferentGroup.group) {
        return { rank: PRIZE_TABLE.firstDifferentGroup.label, amount: PRIZE_TABLE.firstDifferentGroup.amount };
    }

    // 2等
    if (g === PRIZE_TABLE.second.group && n === PRIZE_TABLE.second.number) {
        return { rank: PRIZE_TABLE.second.label, amount: PRIZE_TABLE.second.amount };
    }

    // 3等
    for (const w of PRIZE_TABLE.third.winners) {
        if (g === w.group && n === w.number) {
            return { rank: PRIZE_TABLE.third.label, amount: PRIZE_TABLE.third.amount };
        }
    }

    // 4等（組下1ケタ + 指定番号）
    for (const w of PRIZE_TABLE.fourth.winners) {
        if (n === w.number && (g % 10) === w.groupLastDigit) {
            return { rank: PRIZE_TABLE.fourth.label, amount: PRIZE_TABLE.fourth.amount };
        }
    }

    // 5等（下3ケタ）
    const last3 = n % 1000;
    if (PRIZE_TABLE.fifth.last3.includes(last3)) {
        return { rank: PRIZE_TABLE.fifth.label, amount: PRIZE_TABLE.fifth.amount };
    }

    // 6等（下2ケタ）
    const last2 = n % 100;
    if (PRIZE_TABLE.sixth.last2.includes(last2)) {
        return { rank: PRIZE_TABLE.sixth.label, amount: PRIZE_TABLE.sixth.amount };
    }

    // 7等（下1ケタ）
    const last1 = n % 10;
    if (PRIZE_TABLE.seventh.last1.includes(last1)) {
        return { rank: PRIZE_TABLE.seventh.label, amount: PRIZE_TABLE.seventh.amount };
    }

    return null;
}

function formatResult({ groupDigits, numberDigits, prize }) {
    const ticket = `${groupDigits}組 ${numberDigits}番`;
    if (!prize) return `${ticket}: はずれ`;
    return `${ticket}: ${prize.rank}（${prize.amount}）`;
}

const els = {
    form: document.getElementById("manual-form"),
    group: document.getElementById("group"),
    number: document.getElementById("number"),
    result: document.getElementById("result"),

    startCamera: document.getElementById("start-camera"),
    stopCamera: document.getElementById("stop-camera"),
    captureOcr: document.getElementById("capture-ocr"),
    video: document.getElementById("video"),
    canvas: document.getElementById("canvas"),
    ocrStatus: document.getElementById("ocr-status"),
    ocrRaw: document.getElementById("ocr-raw"),
};

let mediaStream = null;

function setResult(text) {
    // 「未判定」のプレースホルダーは最初の1回で消し、その後は履歴として追加
    if (els.result.dataset.hasHistory !== "true") {
        els.result.textContent = "";
        els.result.dataset.hasHistory = "true";
    }

    const line = document.createElement("div");
    line.textContent = text;
    els.result.appendChild(line);
}

function setOcrStatus(text) {
    els.ocrStatus.textContent = text;
}

function assertTesseractAvailable() {
    if (!window.Tesseract) {
        throw new Error("Tesseract.js の読み込みに失敗しました（ネットワーク/ブロック等）。");
    }
}

function extractFromOcrText(rawText) {
    const text = String(rawText ?? "")
        .replace(/[０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))
        .replace(/\s+/g, " ");

    // 例: "22組 146504番" のようなパターンを優先
    const groupMatch = text.match(/(\d{1,3})\s*組/);
    const numberMatch = text.match(/(\d{6})\s*番/);

    if (groupMatch && numberMatch) {
        return { groupText: groupMatch[1], numberText: numberMatch[1] };
    }

    // フォールバック: 1〜3桁と6桁が近接している場合
    const nearMatch = text.match(/(\d{1,3})\D{0,10}(\d{6})/);
    if (nearMatch) {
        return { groupText: nearMatch[1], numberText: nearMatch[2] };
    }

    return { groupText: "", numberText: "" };
}

async function startCamera() {
    if (mediaStream) return;

    mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
            facingMode: "environment",
            width: { ideal: 1280 },
            height: { ideal: 720 },
        },
        audio: false,
    });

    els.video.srcObject = mediaStream;

    els.startCamera.disabled = true;
    els.stopCamera.disabled = false;
    els.captureOcr.disabled = false;
}

function stopCamera() {
    if (!mediaStream) return;

    for (const track of mediaStream.getTracks()) {
        track.stop();
    }

    mediaStream = null;
    els.video.srcObject = null;

    els.startCamera.disabled = false;
    els.stopCamera.disabled = true;
    els.captureOcr.disabled = true;
}

async function captureAndOcr() {
    assertTesseractAvailable();

    if (!mediaStream) {
        setOcrStatus("先にカメラを開始してください。");
        return;
    }

    const video = els.video;
    const canvas = els.canvas;

    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) {
        setOcrStatus("映像の準備中です。少し待って再試行してください。");
        return;
    }

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(video, 0, 0, width, height);

    setOcrStatus("OCR 実行中...");
    els.ocrRaw.textContent = "";

    const result = await window.Tesseract.recognize(canvas, "jpn+eng", {
        logger: (m) => {
            if (m?.status) {
                const pct = typeof m.progress === "number" ? ` ${(m.progress * 100).toFixed(0)}%` : "";
                setOcrStatus(`${m.status}${pct}`);
            }
        },
    });

    const raw = result?.data?.text ?? "";
    els.ocrRaw.textContent = raw;

    const extracted = extractFromOcrText(raw);
    if (extracted.groupText) els.group.value = extracted.groupText;
    if (extracted.numberText) els.number.value = extracted.numberText;

    setOcrStatus(extracted.groupText && extracted.numberText ? "読み取り成功（入力欄に反映）" : "読み取り完了（組/番号を抽出できませんでした）");
}

els.form.addEventListener("submit", (e) => {
    e.preventDefault();

    const parsed = parseGroupAndNumber({
        groupText: els.group.value,
        numberText: els.number.value,
    });

    if (!parsed.ok) {
        setResult(parsed.message);
        return;
    }

    const prize = checkPrize(parsed.group, parsed.number);
    setResult(formatResult({ groupDigits: parsed.groupDigits, numberDigits: parsed.numberDigits, prize }));
});

els.startCamera.addEventListener("click", async () => {
    try {
        await startCamera();
        setOcrStatus("カメラ起動完了");
    } catch (err) {
        setOcrStatus(`カメラ開始に失敗: ${err?.message ?? String(err)}`);
    }
});

els.stopCamera.addEventListener("click", () => {
    stopCamera();
    setOcrStatus("停止しました");
});

els.captureOcr.addEventListener("click", async () => {
    try {
        await captureAndOcr();
    } catch (err) {
        setOcrStatus(`OCRに失敗: ${err?.message ?? String(err)}`);
    }
});

window.addEventListener("beforeunload", () => {
    stopCamera();
});
