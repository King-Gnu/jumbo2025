const PRIZE_TABLE = Object.freeze({
    first: { label: "1等", amount: "7億円", yen: 700_000_000, group: 22, number: 146504 },
    firstAdjacent: { label: "1等の前後賞", amount: "1.5億円", yen: 150_000_000 },
    firstDifferentGroup: { label: "1等の組違い賞", amount: "10万円", yen: 100_000, number: 146504, group: 22 },
    second: { label: "2等", amount: "1億円", yen: 100_000_000, group: 43, number: 127948 },
    third: {
        label: "3等",
        amount: "1000万円",
        yen: 10_000_000,
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
        yen: 1_000_000,
        winners: [
            { groupLastDigit: 7, number: 114925 },
            { groupLastDigit: 2, number: 182568 },
        ],
    },
    fifth: { label: "5等", amount: "1万円", yen: 10_000, last3: [345, 819, 350] },
    sixth: { label: "6等", amount: "3000円", yen: 3_000, last2: [2] }, // 02
    seventh: { label: "7等", amount: "300円", yen: 300, last1: [0] },
});

function normalizeDigits(value) {
    const halfWidth = String(value)
        .replace(/[０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))
        .replace(/[^0-9]/g, "")
        .trim();
    return halfWidth;
}

function pad6(n) {
    return String(n).padStart(6, "0");
}

function parseGroupAndNumber({ groupText, numberText, spanBeforeText, spanAfterText }) {
    const groupDigits = normalizeDigits(groupText);
    const numberDigits = normalizeDigits(numberText);
    const spanBeforeDigits = normalizeDigits(spanBeforeText ?? "0");
    const spanAfterDigits = normalizeDigits(spanAfterText ?? "0");

    if (!groupDigits || !numberDigits) {
        return { ok: false, message: "組と番号を入力してください。" };
    }

    const spanBefore = spanBeforeDigits ? Number.parseInt(spanBeforeDigits, 10) : 0;
    const spanAfter = spanAfterDigits ? Number.parseInt(spanAfterDigits, 10) : 0;

    if (!Number.isFinite(spanBefore) || spanBefore < 0 || !Number.isFinite(spanAfter) || spanAfter < 0) {
        return { ok: false, message: "連番チェック（前/後）は0以上の数字で入力してください。" };
    }
    if (spanBefore > 5000 || spanAfter > 5000) {
        return { ok: false, message: "連番チェック（前/後）はそれぞれ5000以下で入力してください。" };
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

    return { ok: true, group, number, spanBefore, spanAfter, groupDigits, numberDigits };
}

function checkPrize(group, number) {
    const n = number;
    const g = group;

    // 1等
    if (g === PRIZE_TABLE.first.group && n === PRIZE_TABLE.first.number) {
        return { rank: PRIZE_TABLE.first.label, amount: PRIZE_TABLE.first.amount, yen: PRIZE_TABLE.first.yen };
    }

    // 1等 前後賞（同組で±1）
    if (g === PRIZE_TABLE.first.group && (n === PRIZE_TABLE.first.number - 1 || n === PRIZE_TABLE.first.number + 1)) {
        return { rank: PRIZE_TABLE.firstAdjacent.label, amount: PRIZE_TABLE.firstAdjacent.amount, yen: PRIZE_TABLE.firstAdjacent.yen };
    }

    // 1等 組違い賞（同番号で組が違う）
    if (n === PRIZE_TABLE.firstDifferentGroup.number && g !== PRIZE_TABLE.firstDifferentGroup.group) {
        return { rank: PRIZE_TABLE.firstDifferentGroup.label, amount: PRIZE_TABLE.firstDifferentGroup.amount, yen: PRIZE_TABLE.firstDifferentGroup.yen };
    }

    // 2等
    if (g === PRIZE_TABLE.second.group && n === PRIZE_TABLE.second.number) {
        return { rank: PRIZE_TABLE.second.label, amount: PRIZE_TABLE.second.amount, yen: PRIZE_TABLE.second.yen };
    }

    // 3等
    for (const w of PRIZE_TABLE.third.winners) {
        if (g === w.group && n === w.number) {
            return { rank: PRIZE_TABLE.third.label, amount: PRIZE_TABLE.third.amount, yen: PRIZE_TABLE.third.yen };
        }
    }

    // 4等（組下1ケタ + 指定番号）
    for (const w of PRIZE_TABLE.fourth.winners) {
        if (n === w.number && (g % 10) === w.groupLastDigit) {
            return { rank: PRIZE_TABLE.fourth.label, amount: PRIZE_TABLE.fourth.amount, yen: PRIZE_TABLE.fourth.yen };
        }
    }

    // 5等（下3ケタ）
    const last3 = n % 1000;
    if (PRIZE_TABLE.fifth.last3.includes(last3)) {
        return { rank: PRIZE_TABLE.fifth.label, amount: PRIZE_TABLE.fifth.amount, yen: PRIZE_TABLE.fifth.yen };
    }

    // 6等（下2ケタ）
    const last2 = n % 100;
    if (PRIZE_TABLE.sixth.last2.includes(last2)) {
        return { rank: PRIZE_TABLE.sixth.label, amount: PRIZE_TABLE.sixth.amount, yen: PRIZE_TABLE.sixth.yen };
    }

    // 7等（下1ケタ）
    const last1 = n % 10;
    if (PRIZE_TABLE.seventh.last1.includes(last1)) {
        return { rank: PRIZE_TABLE.seventh.label, amount: PRIZE_TABLE.seventh.amount, yen: PRIZE_TABLE.seventh.yen };
    }

    return null;
}

function formatResult({ groupDigits, numberDigits, prize }) {
    const ticket = `${groupDigits}組 ${numberDigits}番`;
    if (!prize) return `${ticket}: はずれ`;
    return `${ticket}: ${prize.rank}（${prize.amount}）`;
}

function formatYen(yen) {
    return `${Math.trunc(yen).toLocaleString("ja-JP")}円`;
}

function clearPlaceholderOnce() {
    if (els.result.dataset.hasHistory !== "true") {
        els.result.textContent = "";
        els.result.dataset.hasHistory = "true";
    }
}

function prependItems(items) {
    clearPlaceholderOnce();

    // 先頭に積むため、逆順にprependする（表示順はitemsの順）
    for (let i = items.length - 1; i >= 0; i -= 1) {
        const { text, className } = items[i];
        const line = document.createElement("div");
        line.className = className ? `result-item ${className}` : "result-item";
        line.textContent = text;
        els.result.insertBefore(line, els.result.firstChild);
    }
}

const els = {
    form: document.getElementById("manual-form"),
    group: document.getElementById("group"),
    number: document.getElementById("number"),
    spanBefore: document.getElementById("span-before"),
    spanAfter: document.getElementById("span-after"),
    result: document.getElementById("result"),
};

function setResult(text, extraClassName = "") {
    prependItems([{ text, className: extraClassName }]);
}

els.form.addEventListener("submit", (e) => {
    e.preventDefault();

    const parsed = parseGroupAndNumber({
        groupText: els.group.value,
        numberText: els.number.value,
        spanBeforeText: els.spanBefore?.value ?? "0",
        spanAfterText: els.spanAfter?.value ?? "0",
    });

    if (!parsed.ok) {
        setResult(parsed.message);
        return;
    }

    if (!parsed.spanBefore && !parsed.spanAfter) {
        const prize = checkPrize(parsed.group, parsed.number);
        const totalWin = prize?.yen ?? 0;
        const cost = 300;
        const profit = totalWin - cost;
        prependItems([
            { text: formatResult({ groupDigits: parsed.groupDigits, numberDigits: parsed.numberDigits, prize }) },
            { text: `合計当せん金: ${formatYen(totalWin)} / 購入額: ${formatYen(cost)} / 収支: ${profit >= 0 ? "+" : "-"}${formatYen(Math.abs(profit))}`, className: "summary" },
        ]);
        return;
    }

    const min = Math.max(0, parsed.number - parsed.spanBefore);
    const max = Math.min(999999, parsed.number + parsed.spanAfter);
    const checkedCount = max - min + 1;

    const items = [];
    items.push({ text: `${parsed.groupDigits}組 ${parsed.numberDigits}番 の連番チェック（前${parsed.spanBefore} / 後${parsed.spanAfter} / ${checkedCount}枚）`, className: "batch" });

    let hitCount = 0;
    let totalWin = 0;
    for (let num = min; num <= max; num += 1) {
        const prize = checkPrize(parsed.group, num);
        if (prize) {
            hitCount += 1;
            totalWin += prize.yen ?? 0;
        }
        items.push({ text: formatResult({ groupDigits: parsed.groupDigits, numberDigits: pad6(num), prize }) });
    }

    const cost = 300 * checkedCount;
    const profit = totalWin - cost;
    items.push({ text: `当たり: ${hitCount}件 / 全${checkedCount}枚`, className: "summary" });
    items.push({ text: `合計当せん金: ${formatYen(totalWin)} / 購入額: ${formatYen(cost)} / 収支: ${profit >= 0 ? "+" : "-"}${formatYen(Math.abs(profit))}`, className: "summary" });

    prependItems(items);
});
