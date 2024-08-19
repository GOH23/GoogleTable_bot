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
const promises_1 = require("fs/promises");
const conversations_1 = require("@grammyjs/conversations");
(0, dotenv_1.config)();
let ChatIds = [];
let AddNotificationFor = ["woodd_i", "llicette", "goh222"];
let WeekDoc;
let MainDoc;
let maxseconds = { maxMilliseconds: 100000 };
const locates = "ru-RU";
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
    "Вывести еженедельную таблицу",
    "Настройки"
];
const SubCommands = [
    "Удалить категорию или счет",
    "Добавить категорию или счет",
    "Назад"
];
const serviceAccountAuth = new google_auth_library_1.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY,
    scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.file',
    ]
});
const NotificationSend = (NotifType) => {
    ChatIds.forEach((element) => __awaiter(void 0, void 0, void 0, function* () {
        yield bot.api.sendMessage(element, NotifType == "add_category" ? "Добавлена новая категория!" :
            NotifType == "add_score" ? "Добавлен новый счет!" :
                NotifType == "add_transaction" ? "Добавлена новая транзакция" :
                    NotifType == "delete_category" ? "Удалена категория" :
                        NotifType == "delete_score" ? "Удален счет!" : "");
    }));
};
const GetFileLinkFunction = (Doc, SetSheetID) => {
    var sheetId;
    if (SetSheetID)
        sheetId = Doc.sheetsByIndex[WeekDoc.sheetCount - 1].sheetId;
    var spreadsheetId = Doc.sheetsByIndex[WeekDoc.sheetCount - 1]._spreadsheet.spreadsheetId;
    return SetSheetID ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit?gid=${sheetId}` : `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
};
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
        WeekDoc.addSheet({ title: `sheet_${NowDate.toLocaleDateString(locates)}`, headerValues: HeaderValues });
        return;
    }
    var dateSplit = sheet.title.split("_")[1].trim().split(".");
    var SheetCreatedDate = new Date(`${dateSplit[2]}.${dateSplit[1]}.${dateSplit[0]}`);
    SheetCreatedDate.setDate(SheetCreatedDate.getDate() + 7);
    if (NowDate >= SheetCreatedDate) {
        WeekDoc.addSheet({ title: `sheet_${NowDate.toLocaleDateString(locates)}`, headerValues: HeaderValues });
    }
}), 10000);
const MainKeyboard = grammy_1.Keyboard.from(Commands.map((el) => [grammy_1.Keyboard.text(el)])).resized();
const SettingsKeyboard = grammy_1.Keyboard.from(SubCommands.map((el) => [grammy_1.Keyboard.text(el)])).resized();
const FinalKeyBoard = new grammy_1.InlineKeyboard().text("Отправить", "send").text("Выйти", "exit");
const SelectKeyboard = new grammy_1.InlineKeyboard().text("Да").text("Нет");
const bot = new grammy_1.Bot(process.env.BOT_TOKEN);
bot.api.setMyCommands([
    { command: "start", description: "Вывести главное меню бота" },
    { command: "table", description: "Вывести главную таблицу" },
    { command: "edit", description: "Изменить данные в еженедельной таблице" },
    { command: 'sort', description: "Отсортировать таблицу" }
]);
bot.use((0, grammy_1.session)({ initial: () => ({}) }));
bot.use((0, conversations_1.conversations)());
function loadScoreKeyBoard() {
    return __awaiter(this, void 0, void 0, function* () {
        let ReadedData = JSON.parse(yield (0, promises_1.readFile)("./config.json", { encoding: 'utf-8' }));
        return ReadedData;
    });
}
const getMessage = (data, user) => {
    var _a, _b;
    const { score, sum, category, comment, date } = data;
    return `${user ? `Пользователь <a href="tg://user?id=${(_a = user.ctx.chat) === null || _a === void 0 ? void 0 : _a.id}">${(_b = user.ctx.chat) === null || _b === void 0 ? void 0 : _b.username}</a> добавил транзакцию` : `Ваши введенные данные:`} \n
        <b>Выбранный cчет: <code>${score}</code></b>\n
        <b>Написанная сумма: <code>${sum}</code></b>\n
        ${date ? `<b>Написанная дата: <code>${date}</code></b>\n` : ``}
        <b>Написанный комментарий: <code>${comment}</code></b>\n
        <b>Выбранная категория: <code>${category}</code></b>`;
};
function write_file(data) {
    return __awaiter(this, void 0, void 0, function* () {
        yield (0, promises_1.writeFile)("./config.json", JSON.stringify(data));
    });
}
function addweaktable(conversation, ctx) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        var ReadedData = yield loadScoreKeyBoard();
        const mes1 = yield ctx.reply("Выберите счет", { reply_markup: grammy_1.InlineKeyboard.from(ReadedData.scores.map((el) => [grammy_1.InlineKeyboard.text(el)])) });
        const scoreQuerry = yield conversation.waitFor("callback_query:data");
        const mes2 = yield ctx.reply("Напишите сумму");
        var sumAnswerMessage = yield conversation.wait(Object.assign({}, maxseconds));
        const sum = (_a = sumAnswerMessage.message) === null || _a === void 0 ? void 0 : _a.text;
        const mes3 = yield ctx.reply("Напишите ваш комментарий");
        var commentAnswerMessage = yield conversation.wait(Object.assign({}, maxseconds));
        const comment = (_b = commentAnswerMessage.message) === null || _b === void 0 ? void 0 : _b.text;
        const mes4 = yield ctx.reply("Выберите категорию", { reply_markup: grammy_1.InlineKeyboard.from(ReadedData.categories.map((el) => [grammy_1.InlineKeyboard.text(el)])) });
        const categoryQuerry = yield conversation.waitFor("callback_query:data");
        const mes5 = yield ctx.reply(getMessage({ score: scoreQuerry.callbackQuery.data, sum: sum, comment: comment, category: categoryQuerry.callbackQuery.data }), { reply_markup: FinalKeyBoard, parse_mode: 'HTML' });
        const finalQuerryData = yield conversation.waitFor("callback_query:data");
        switch (finalQuerryData.callbackQuery.data) {
            case "send":
                WeekDoc.sheetsByIndex[WeekDoc.sheetCount - 1].addRow({
                    "Дата транзакции": new Date().toLocaleDateString(locates),
                    Счет: scoreQuerry.callbackQuery.data,
                    Сумма: sum,
                    Комментарий: comment,
                    Категория: categoryQuerry.callbackQuery.data
                });
                MainDoc.sheetsByIndex[0].addRow({
                    "Дата транзакции": new Date().toLocaleDateString(locates),
                    Счет: scoreQuerry.callbackQuery.data,
                    Сумма: sum,
                    Комментарий: comment,
                    Категория: categoryQuerry.callbackQuery.data,
                });
                yield ctx.reply(getMessage({ score: scoreQuerry.callbackQuery.data, sum: sum, comment: comment, category: categoryQuerry.callbackQuery.data }, { ctx }), { parse_mode: 'HTML' });
                NotificationSend("add_transaction");
                ctx.deleteMessages([mes1.message_id, mes2.message_id, mes3.message_id, mes4.message_id, mes5.message_id, sumAnswerMessage.msgId, commentAnswerMessage.msgId]);
                break;
            default:
                yield ctx.reply("Вы вышли из создания транзакции.");
                return;
        }
    });
}
function on_delete(conversation, ctx) {
    return __awaiter(this, void 0, void 0, function* () {
        var ReadedData = yield loadScoreKeyBoard();
        const mes1 = yield ctx.reply("Выберите,что вы хотите удалить", {
            reply_markup: new grammy_1.InlineKeyboard().text("Категорию").text("Счет")
        });
        var selected_for_delete = yield conversation.waitFor("callback_query:data");
        const mes2 = yield ctx.reply("Выберите какую категорию вы хотите удалить", {
            reply_markup: grammy_1.InlineKeyboard.from(selected_for_delete.callbackQuery.data == "Категорию" ? ReadedData.categories.map((el) => [grammy_1.InlineKeyboard.text(el)]) : ReadedData.scores.map((el) => [grammy_1.InlineKeyboard.text(el)]))
        });
        var { callbackQuery: { data } } = yield conversation.waitFor("callback_query:data");
        const mes3 = yield ctx.reply(`Вы точно хотите удалить ${selected_for_delete.callbackQuery.data} под названием: ${data}`, { reply_markup: SelectKeyboard });
        const selectedYN = yield conversation.waitFor("callback_query:data");
        ctx.deleteMessages([mes2.message_id, mes1.message_id, mes3.message_id]);
        if (selectedYN.callbackQuery.data = "Да") {
            const indexOfElement = selected_for_delete.callbackQuery.data == "Категорию" ? ReadedData.categories.indexOf(data) : ReadedData.scores.indexOf(data);
            if (indexOfElement > -1) {
                if (selected_for_delete.callbackQuery.data == "Категорию")
                    ReadedData.categories.splice(indexOfElement, 1);
                else
                    ReadedData.scores.splice(indexOfElement, 1);
            }
            write_file(ReadedData);
            NotificationSend(data == "Категорию" ? "delete_category" : "delete_score");
            yield ctx.reply("Успешно удалено!");
        }
        else {
            yield ctx.reply("Отмена удаления категории");
            return;
        }
    });
}
function on_add(conversation, ctx) {
    return __awaiter(this, void 0, void 0, function* () {
        var ReadedData = yield loadScoreKeyBoard();
        const mes1 = yield ctx.reply("Выберите,что вы хотите добавить", {
            reply_markup: new grammy_1.InlineKeyboard().text("Категорию").text("Счет")
        });
        var { callbackQuery: { data } } = yield conversation.waitFor("callback_query:data");
        const mes2 = yield ctx.reply("Напишите название");
        const NewName = yield conversation.form.text();
        data == "Категорию" ? ReadedData.categories.push(NewName) : ReadedData.scores.push(NewName);
        write_file(ReadedData);
        ctx.deleteMessages([mes2.message_id, mes1.message_id]);
        NotificationSend(data == "Категорию" ? "add_category" : "add_score");
        yield ctx.reply("Успешно добавлено");
        return;
    });
}
function addweakwithcustomdate(conversation, ctx) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c;
        var ReadedData = yield loadScoreKeyBoard();
        const mes1 = yield ctx.reply("Выберите счет", { reply_markup: grammy_1.InlineKeyboard.from(ReadedData.scores.map((el) => [grammy_1.InlineKeyboard.text(el)])) });
        const scoreQuerry = yield conversation.waitFor("callback_query:data", Object.assign({}, maxseconds));
        const datemsg = yield ctx.reply("Напишите дату");
        var dateAnswerMessage = yield conversation.wait(Object.assign({}, maxseconds));
        const date = (_a = dateAnswerMessage.message) === null || _a === void 0 ? void 0 : _a.text;
        const mes2 = yield ctx.reply("Напишите сумму");
        var sumAnswerMessage = yield conversation.wait(Object.assign({}, maxseconds));
        const sum = (_b = sumAnswerMessage.message) === null || _b === void 0 ? void 0 : _b.text;
        const mes3 = yield ctx.reply("Напишите ваш комментарий");
        var commentAnswerMessage = yield conversation.wait(Object.assign({}, maxseconds));
        const comment = (_c = commentAnswerMessage.message) === null || _c === void 0 ? void 0 : _c.text;
        const mes4 = yield ctx.reply("Выберите категорию", { reply_markup: grammy_1.InlineKeyboard.from(ReadedData.categories.map((el) => [grammy_1.InlineKeyboard.text(el)])) });
        const categoryQuerry = yield conversation.waitFor("callback_query:data");
        const mes5 = yield ctx.reply(getMessage({ score: scoreQuerry.callbackQuery.data, sum: sum, comment: comment, category: categoryQuerry.callbackQuery.data, date: date }), { reply_markup: FinalKeyBoard, parse_mode: 'HTML' });
        const finalQuerryData = yield conversation.waitFor("callback_query:data");
        switch (finalQuerryData.callbackQuery.data) {
            case "send":
                Promise.all([yield WeekDoc.sheetsByIndex[WeekDoc.sheetCount - 1].addRow({
                        "Дата транзакции": date,
                        Счет: scoreQuerry.callbackQuery.data,
                        Сумма: sum,
                        Комментарий: comment,
                        Категория: categoryQuerry.callbackQuery.data
                    }),
                    yield MainDoc.sheetsByIndex[0].addRow({
                        "Дата транзакции": date,
                        Счет: scoreQuerry.callbackQuery.data,
                        Сумма: sum,
                        Комментарий: comment,
                        Категория: categoryQuerry.callbackQuery.data,
                    })]);
                yield ctx.deleteMessages([mes1.message_id, mes2.message_id, mes3.message_id, mes4.message_id, mes5.message_id, datemsg.message_id, sumAnswerMessage.msgId, commentAnswerMessage.msgId, dateAnswerMessage.msgId]);
                NotificationSend("add_transaction");
                yield ctx.reply(getMessage({ score: scoreQuerry.callbackQuery.data, sum: sum, comment: comment, category: categoryQuerry.callbackQuery.data, date: date }, { ctx }), { parse_mode: 'HTML' });
                break;
            default:
                yield ctx.reply("Вы вышли из создания транзакции.");
                return;
        }
    });
}
function on_edit(conversation, ctx) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c;
        var ReadedData = yield loadScoreKeyBoard();
        var sheet = WeekDoc.sheetsByIndex[WeekDoc.sheetCount - 1];
        const rows = (yield sheet.getRows());
        var rowMessage = "Выберите транзакцию по айди из списка\n";
        HeaderValues.map((el) => {
            rowMessage += `${el} `;
        });
        rowMessage += "\n";
        rows.map((el, ind) => {
            rowMessage += `<b>${el.get("Дата транзакции")} ${el.get("Счет")} ${el.get("Сумма")} ${el.get("Комментарий")} ${el.get("Категория")}</b>\n`;
        });
        const mes1 = yield ctx.reply(rowMessage, { parse_mode: 'HTML', reply_markup: grammy_1.InlineKeyboard.from(rows.map((_el, ind) => [grammy_1.InlineKeyboard.text(ind.toString())])) });
        var { callbackQuery } = yield conversation.waitFor("callback_query:data", Object.assign({}, maxseconds));
        ctx.deleteMessages([mes1.message_id]);
        var row = rows[Number(callbackQuery.data)];
        const mes2 = yield ctx.reply("Вы хотите изменить \"Дату транзакции\"", { reply_markup: grammy_1.InlineKeyboard.from([[grammy_1.InlineKeyboard.text('Оставить без изменений')]]) });
        var data1 = yield conversation.wait(Object.assign({}, maxseconds));
        let dateVal = ((_a = data1.message) === null || _a === void 0 ? void 0 : _a.text) ? data1.message.text : row.get("Дата транзакции");
        ctx.deleteMessages([mes2.message_id]);
        const mes3 = yield ctx.reply("Вы хотите изменить \"Счет\"", { reply_markup: grammy_1.InlineKeyboard.from([[grammy_1.InlineKeyboard.text('Оставить без изменений')], ...ReadedData.scores.map(el => [grammy_1.InlineKeyboard.text(el)])]) });
        var data2 = yield conversation.waitFor("callback_query:data", Object.assign({}, maxseconds));
        let ScoreVal = data2.callbackQuery.data == "Оставить без изменений" ? row.get("Счет") : data2.callbackQuery.data;
        ctx.deleteMessages([mes3.message_id]);
        const mes4 = yield ctx.reply("Вы хотите изменить \"Сумма\"", { reply_markup: grammy_1.InlineKeyboard.from([[grammy_1.InlineKeyboard.text('Оставить без изменений')]]) });
        var data1 = yield conversation.wait(Object.assign({}, maxseconds));
        let sumVal = ((_b = data1.message) === null || _b === void 0 ? void 0 : _b.text) ? data1.message.text : row.get("Сумма");
        ctx.deleteMessages([mes4.message_id]);
        const mes5 = yield ctx.reply("Вы хотите изменить \"Комментарий\"", { reply_markup: grammy_1.InlineKeyboard.from([[grammy_1.InlineKeyboard.text('Оставить без изменений')]]) });
        var data1 = yield conversation.wait(Object.assign({}, maxseconds));
        let commentVal = ((_c = data1.message) === null || _c === void 0 ? void 0 : _c.text) ? data1.message.text : row.get("Комментарий");
        ctx.deleteMessages([mes5.message_id]);
        const mes6 = yield ctx.reply("Вы хотите изменить \"Категория\"", { reply_markup: grammy_1.InlineKeyboard.from([[grammy_1.InlineKeyboard.text('Оставить без изменений')], ...ReadedData.categories.map(el => [grammy_1.InlineKeyboard.text(el)])]) });
        var data2 = yield conversation.waitFor("callback_query:data", Object.assign({}, maxseconds));
        let CategoryVal = data2.callbackQuery.data == "Оставить без изменений" ? row.get("Категория") : data2.callbackQuery.data;
        ctx.deleteMessages([mes6.message_id]);
        row.set("Дату транзакции", dateVal);
        row.set("Счет", ScoreVal);
        row.set("Сумма", sumVal);
        row.set("Комментарий", commentVal);
        row.set("Категория", CategoryVal);
        yield row.save();
        yield ctx.reply("Успешно сохранено.");
    });
}
bot.use((0, conversations_1.createConversation)(addweaktable, "addtable"));
bot.use((0, conversations_1.createConversation)(addweakwithcustomdate, "datetable"));
bot.use((0, conversations_1.createConversation)(on_delete, "delete"));
bot.use((0, conversations_1.createConversation)(on_add, "add"));
bot.use((0, conversations_1.createConversation)(on_edit, 'edit'));
bot.command("start", (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    const { message_id } = yield ctx.reply("Приветствую тебя пользователь. Посмотри мое меню", {
        reply_markup: MainKeyboard
    });
    setTimeout(() => __awaiter(void 0, void 0, void 0, function* () {
        yield ctx.deleteMessages([message_id]);
    }), 2000);
}));
bot.command("edit", (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    yield ctx.conversation.enter('edit');
}));
bot.command("sort", (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    var sheet = WeekDoc.sheetsByIndex[WeekDoc.sheetCount - 1];
    const rows = (yield sheet.getRows());
    const sortedRows = rows.sort((a, b) => {
        var dateA = new Date(a.get("Дата транзакции")).getTime();
        var dateB = new Date(b.get("Дата транзакции")).getTime();
        return dateA > dateB ? 1 : -1;
    });
    yield sheet.clear();
    yield sheet.setHeaderRow(HeaderValues);
    Promise.all(yield sheet.addRows(sortedRows.map((el) => {
        return {
            "Дата транзакции": el.get("Дата транзакции"),
            Счет: el.get("Счет"),
            Сумма: el.get("Сумма"),
            Комментарий: el.get("Комментарий"),
            Категория: el.get("Категория")
        };
    })));
    const { message_id } = yield ctx.reply("Успешная сортировка");
    setTimeout(() => __awaiter(void 0, void 0, void 0, function* () {
        yield ctx.deleteMessages([message_id]);
    }), 2000);
}));
bot.hears("Назад", (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    return yield ctx.reply("Вы вышли в главное меню", {
        reply_markup: MainKeyboard
    });
}));
bot.hears("Настройки", (ctx) => __awaiter(void 0, void 0, void 0, function* () { return yield ctx.reply("Вы перешли в панель настроек", { reply_markup: SettingsKeyboard }); }));
bot.hears("Удалить категорию или счет", (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    yield ctx.conversation.enter("delete");
}));
bot.hears("Добавить категорию или счет", (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    yield ctx.conversation.enter("add");
}));
bot.command("table", (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    yield ctx.reply(`Вот ваша ссылка на таблицу всех транзакций: <a href='https://docs.google.com/spreadsheets/d/${process.env.MAIN_DOC}/edit'>Перейти</a>`, { parse_mode: 'HTML' });
}));
bot.command("update_notifications", (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    if (AddNotificationFor.indexOf(ctx.chat.username) > -1) {
        if (ChatIds.indexOf(ctx.chat.id.toString()) == -1) {
            ChatIds.push(ctx.chat.id.toString());
            yield ctx.reply("Вы обновили систему уведомлений, пока сессия бота активна.");
        }
        else {
            yield ctx.reply("Вы уже добавлены в систему уведомлений, пока сессия бота активна.");
        }
    }
    else {
        yield ctx.reply("У вас нет прав на использование этой команды.");
    }
}));
bot.command("cancel", (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    yield ctx.conversation.exit("addtable");
    yield ctx.conversation.exit("datetable");
}));
bot.hears("Внести транзакцию", ctx => {
    ctx.conversation.enter("addtable");
    setInterval(() => {
        ctx.deleteMessage();
    }, 10000);
});
bot.hears("Внести транзакцию задним числом", ctx => {
    ctx.conversation.enter("datetable");
    setInterval(() => {
        ctx.deleteMessage();
    }, 10000);
});
bot.hears("Вывести еженедельную таблицу", (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    yield ctx.reply(`Вот ваша ссылка на таблицу этой недели: <a href='${GetFileLinkFunction(WeekDoc, true)}'>Перейти</a>`, { parse_mode: 'HTML' });
}));
bot.catch((er) => __awaiter(void 0, void 0, void 0, function* () {
    er.ctx.reply(er.message);
}));
bot.start();
