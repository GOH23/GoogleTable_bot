"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const grammy_1 = require("grammy");
const dotenv_1 = require("dotenv");
const google_spreadsheet_1 = require("google-spreadsheet");
const google_auth_library_1 = require("google-auth-library");
const conversations_1 = require("@grammyjs/conversations");
(0, dotenv_1.config)();
let WeekDoc;
let MainDoc;
let HeaderValues = [
    "Дата транзакции",
    "Счет",
    "Сумма",
    "Комментарий",
    "Категория"
];
const Commands = [
    "Внести транзакцию",
    "Внести транзакцию задним числом",
    "Вывести еженедельную таблицу"
];
const serviceAccountAuth = new google_auth_library_1.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY,
    scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.file',
    ]
});
const GetFileLinkFunction = (Doc, SetSheetID) => {
    var sheetId;
    if (SetSheetID)
        sheetId = Doc.sheetsByIndex[WeekDoc.sheetCount - 1].sheetId;
    var spreadsheetId = Doc.sheetsByIndex[WeekDoc.sheetCount - 1]._spreadsheet.spreadsheetId;
    return SetSheetID ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit?gid=${sheetId}` : `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
};
const Category = [
    "Категория1",
    "Категория2",
    "Категория3"
];
var Score;
(function (Score) {
    Score["\u0421\u0447\u0435\u04421"] = "\u0421\u0447\u0435\u04421";
    Score["\u0421\u0447\u0435\u04422"] = "\u0421\u0447\u0435\u04422";
    Score["\u0421\u0447\u0435\u04423"] = "\u0421\u0447\u0435\u04423";
})(Score || (Score = {}));
(function () {
    return __awaiter(this, void 0, void 0, function* () {
        WeekDoc = new google_spreadsheet_1.GoogleSpreadsheet(process.env.WEEK_DOC, serviceAccountAuth);
        MainDoc = new google_spreadsheet_1.GoogleSpreadsheet(process.env.MAIN_DOC, serviceAccountAuth);
        yield MainDoc.loadInfo();
        if (!MainDoc.sheetsByTitle["Главная таблица"])
            MainDoc.addSheet({ title: `Главная таблица`, headerValues: HeaderValues });
        yield WeekDoc.loadInfo();
    });
})();
setInterval(() => __awaiter(void 0, void 0, void 0, function* () {
    let sheet = WeekDoc.sheetsByIndex[WeekDoc.sheetCount - 1];
    var NowDate = new Date();
    if (sheet.title.split("_").length != 2) {
        WeekDoc.addSheet({ title: `sheet_${NowDate.toLocaleDateString()}`, headerValues: HeaderValues });
        return;
    }
    var SheetCreatedDate = new Date(sheet.title.split("_")[1]);
    var SheetCreatedDatePlusWeek = new Date(SheetCreatedDate.setDate(SheetCreatedDate.getDate() + 7));
    if (NowDate == SheetCreatedDatePlusWeek) {
        WeekDoc.addSheet({ title: `sheet_${NowDate.toLocaleDateString()}`, headerValues: HeaderValues });
    }
}), 60000);
const buttonRows = Commands.map((el) => [grammy_1.Keyboard.text(el)]);
const MainKeyboard = grammy_1.Keyboard.from(buttonRows).resized();
const ScoreKeyBoard = grammy_1.InlineKeyboard.from(Object.keys(Score).map((el, ind) => [grammy_1.InlineKeyboard.text(el, Object.values(Score)[ind])]));
const FinalKeyBoard = new grammy_1.InlineKeyboard().text("Отправить", "send").text("Выйти", "exit");
const CategoryKeyBoard = grammy_1.InlineKeyboard.from(Category.map((el, ind) => [grammy_1.InlineKeyboard.text(el)]));
const bot = new grammy_1.Bot(process.env.BOT_TOKEN);
bot.use((0, grammy_1.session)({ initial: () => ({}) }));
bot.use((0, conversations_1.conversations)());
function addweaktable(conversation, ctx) {
    return __awaiter(this, void 0, void 0, function* () {
        const mes1 = yield ctx.reply("Выберите счет", { reply_markup: ScoreKeyBoard });
        const scoreQuerry = yield conversation.waitFor("callback_query:data");
        const mes2 = yield ctx.reply("Напишите сумму");
        const sum = yield conversation.form.number();
        const mes3 = yield ctx.reply("Напишите ваш комментарий");
        const comment = yield conversation.form.text();
        const mes4 = yield ctx.reply("Выберите категорию", { reply_markup: CategoryKeyBoard });
        const categoryQuerry = yield conversation.waitFor("callback_query:data");
        const mes5 = yield ctx.reply(`Ваши введенные данные:\n
        <b>Выбранный cчет: ${scoreQuerry.callbackQuery.data}</b>\n
        <b>Написанная сумма: ${sum}</b>\n
        <b>Написанный комментарий: ${comment}</b>\n
        <b>Выбранная категория: ${categoryQuerry.callbackQuery.data}</b>`, { reply_markup: FinalKeyBoard, parse_mode: 'HTML' });
        const finalQuerryData = yield conversation.waitFor("callback_query:data");
        switch (finalQuerryData.callbackQuery.data) {
            case "send":
                WeekDoc.sheetsByIndex[WeekDoc.sheetCount - 1].addRow({
                    "Дата транзакции": new Date().toLocaleDateString(),
                    Счет: scoreQuerry.callbackQuery.data,
                    Сумма: sum,
                    Комментарий: comment,
                    Категория: categoryQuerry.callbackQuery.data
                });
                MainDoc.sheetsByIndex[0].addRow({
                    "Дата транзакции": new Date().toLocaleDateString(),
                    Счет: scoreQuerry.callbackQuery.data,
                    Сумма: sum,
                    Комментарий: comment,
                    Категория: categoryQuerry.callbackQuery.data,
                });
                yield ctx.reply("Данные успешно отправлены.");
                ctx.deleteMessages([mes1.message_id, mes2.message_id, mes3.message_id, mes4.message_id, mes5.message_id]);
                break;
            default:
                yield ctx.reply("Вы вышли из создания транзакции.");
                return;
        }
    });
}
function addweakwithcustomdate(conversation, ctx) {
    return __awaiter(this, void 0, void 0, function* () {
        const mes1 = yield ctx.reply("Выберите счет", { reply_markup: ScoreKeyBoard });
        const scoreQuerry = yield conversation.waitFor("callback_query:data");
        const datemsg = yield ctx.reply("Напишите дату");
        const date = yield conversation.form.text();
        const mes2 = yield ctx.reply("Напишите сумму");
        const sum = yield conversation.form.number();
        const mes3 = yield ctx.reply("Напишите ваш комментарий");
        const comment = yield conversation.form.text();
        const mes4 = yield ctx.reply("Выберите категорию", { reply_markup: CategoryKeyBoard });
        const categoryQuerry = yield conversation.waitFor("callback_query:data");
        const mes5 = yield ctx.reply(`Ваши введенные данные:\n
        <b>Выбранный cчет: ${scoreQuerry.callbackQuery.data}</b>\n
        <b>Написанная дата: ${date}</b>\n
        <b>Написанная сумма: ${sum}</b>\n
        <b>Написанный комментарий: ${comment}</b>\n
        <b>Выбранная категория: ${categoryQuerry.callbackQuery.data}</b>`, { reply_markup: FinalKeyBoard, parse_mode: 'HTML' });
        const finalQuerryData = yield conversation.waitFor("callback_query:data");
        switch (finalQuerryData.callbackQuery.data) {
            case "send":
                WeekDoc.sheetsByIndex[WeekDoc.sheetCount - 1].addRow({
                    "Дата транзакции": date,
                    Счет: scoreQuerry.callbackQuery.data,
                    Сумма: sum,
                    Комментарий: comment,
                    Категория: categoryQuerry.callbackQuery.data
                });
                MainDoc.sheetsByIndex[0].addRow({
                    "Дата транзакции": date,
                    Счет: scoreQuerry.callbackQuery.data,
                    Сумма: sum,
                    Комментарий: comment,
                    Категория: categoryQuerry.callbackQuery.data,
                });
                yield ctx.deleteMessages([mes1.message_id, mes2.message_id, mes3.message_id, mes4.message_id, mes5.message_id, datemsg.message_id]);
                yield ctx.reply("Данные успешно отправлены.");
                break;
            default:
                yield ctx.reply("Вы вышли из создания транзакции.");
                return;
        }
    });
}
bot.use((0, conversations_1.createConversation)(addweaktable, "addtable"));
bot.use((0, conversations_1.createConversation)(addweakwithcustomdate, "datetable"));
bot.command("start", (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    return yield ctx.reply("Приветствую тебя пользователь. Посмотри мое меню", {
        reply_markup: MainKeyboard
    });
}));
bot.command("admin", (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    MainDoc.setPublicAccessLevel("writer");
    WeekDoc.setPublicAccessLevel("writer");
}));
bot.command("table", (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    yield ctx.reply(`Вот ваша ссылка на таблицу всех транзакций: <a href='https://docs.google.com/spreadsheets/d/${process.env.MAIN_DOC}/edit'>Перейти</a>`, { parse_mode: 'HTML' });
}));
bot.command("cancel", (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    yield ctx.conversation.exit("addtable");
    yield ctx.conversation.exit("datetable");
}));
bot.hears("Внести транзакцию", ctx => ctx.conversation.enter("addtable"));
bot.hears("Внести транзакцию задним числом", ctx => ctx.conversation.enter("datetable"));
bot.hears("Вывести еженедельную таблицу", (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    yield ctx.reply(`Вот ваша ссылка на таблицу этой недели: <a href='${GetFileLinkFunction(WeekDoc, true)}'>Перейти</a>`, { parse_mode: 'HTML' });
}));
bot.catch((er) => __awaiter(void 0, void 0, void 0, function* () {
    er.ctx.reply(er.message);
}));
bot.start();
