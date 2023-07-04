const book = {};
const option = {};

// 開始地点
function main() {
  setup();
  const current = calculate();
  write(current);
  sendMail(current);
}

// 事前準備
function setup() {
  loadBook();
  option.today = new Date();
  // TODO 実行時は自分のメールアドレスに置き換える
  option.email = 'sample@example.com'; 
}

// 実行時点での有償ダイヤの数を算出する
function calculate() {
  const logs = readLog();
  const { purchase, use } = assign(logs);
  const remaining = offset(purchase, use);
  return arrange(remaining);
}

// 「一覧」タブに書き込む
function write(list) {
  book.result.clear();
  const writeArray = convertToArray(list);
  const writeRange = book.result.getRange(1, 1, writeArray.length, 4);
  writeRange.setValues(writeArray);
}

// 通知メールを送る
function sendMail(list) {
  const subject = '[お知らせ]A3! 有償ダイヤの使用期限が近づいています';
  list.filter(elem => checkTerm(elem))
    .forEach(elem => {
      const body = `${elem.date.toLocaleDateString('ja-jp')}に購入した有償ダイヤ(${elem.num}個)が${elem.deadline.toLocaleDateString('ja-jp')}に使用期限を迎えます。プレミアムスカウト(有償ダイヤ5個)を実施してください。`;
      GmailApp.sendEmail(option.email, subject, body);
    });
}

// 実行日がガチャ開始日から使用期限までに収まっているか
function checkTerm({ startDate, deadline }) {
  if (startDate === '' || deadline === '') {
    return false;
  }
  const today = option.today;
  return today.getTime() >= startDate.getTime() &&
    today.getTime() <= deadline.getTime();
}

// スプレッドシートに書き込む用の配列に変換する
function convertToArray(list) {
  const result = [
    ['購入日', '個数', '使用期限', '有償ガチャ開始日']
  ];
  list.forEach(elem => result.push(Object.values(elem)));
  return result;
}

// 有償石所持数のリストを整理する
function arrange(list) {
  return list
    // 無意味な行を削除
    .filter(e => (e.num > 0) && (e.deadline > option.today))
    // 有償ガチャ開始日を設定
    .map(e => ({ ...e, startDate: calculateStartDate(e) }));
}

// 有償ガチャ開始日を計算する
function calculateStartDate({ num, deadline }) {
  const startDate = new Date(deadline);
  const days = Math.ceil(num / 5) + 1;
  startDate.setDate(deadline.getDate() - days);
  return startDate;
}

// 「減った分」を「増えた分」で相殺する
// TODO もっといい書き方がある気がする
function offset(purchase, use) {
  for (minus of use) {
    let num = minus.num;
    for (plus of purchase) {
      if (num >= 0 && plus.deadline > minus.date) {
        num -= plus.num;
        plus.num = -num;
      }
    }
  }
  return purchase;
}

// 一覧を「増えた時」と「減った時」に振り分ける
function assign(range) {
  const purchase = [];
  const use = [];
  range.forEach(row => {
    if (row[0] === '') {
      return;
    }
    const date = row[0];
    const type = row[1];
    const num = row[2];

    if (type === '増えた') {
      purchase.push({
        date, num,
        deadline: calculateDeadline(date)
      });
    } else if (type === '減った') {
      use.push({
        date, num
      });
    }
  });
  return { purchase, use };
}

// 使用期限(購入日から180日後)を算出する
function calculateDeadline(date) {
  const deadline = new Date(date);
  deadline.setDate(date.getDate() + 180);
  return deadline;
}

// 「記録」タブの内容を読み込む
function readLog() {
  const lastRow = book.logs.getLastRow();
  const range = book.logs.getRange(2, 1, lastRow, 3);
  return range.getValues();
}

// スプレッドシートを読み込む
function loadBook() {
  const spreadSheet = SpreadsheetApp.getActiveSpreadsheet();
  book.logs = spreadSheet.getSheetByName('記録');
  book.result = spreadSheet.getSheetByName('一覧');
}


