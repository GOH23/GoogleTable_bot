import { Bot, Context, InlineKeyboard, Keyboard, session } from "grammy";
import { config } from "dotenv";
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from "google-auth-library"
import { readFile, writeFile } from 'fs/promises'
import {
    type Conversation,
    type ConversationFlavor,
    conversations,
    createConversation,
} from "@grammyjs/conversations";
config()
let WeekDoc: GoogleSpreadsheet;
let MainDoc: GoogleSpreadsheet;
let HeaderValues = [
    "Дата транзакции",
    "Счет",
    "Сумма",
    "Комментарий",
    "Категория"
]
const Commands = [
    "Внести транзакцию",
    "Внести транзакцию задним числом",
    "Вывести еженедельную таблицу",
    "Настройки"
]
const SubCommands = [
    "Удалить категорию или счет",
    "Добавить категорию или счет",
    "Назад"
]

const serviceAccountAuth = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY,
    scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.file',
    ]
});
const GetFileLinkFunction = (Doc: GoogleSpreadsheet, SetSheetID?: boolean): string => {
    var sheetId: number | undefined;
    if (SetSheetID) sheetId = Doc.sheetsByIndex[WeekDoc.sheetCount - 1].sheetId
    var spreadsheetId = Doc.sheetsByIndex[WeekDoc.sheetCount - 1]._spreadsheet.spreadsheetId
    return SetSheetID ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit?gid=${sheetId}` : `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
}

(async function () {
    WeekDoc = new GoogleSpreadsheet(process.env.WEEK_DOC!, serviceAccountAuth);
    MainDoc = new GoogleSpreadsheet(process.env.MAIN_DOC!, serviceAccountAuth);
    await MainDoc.loadInfo();
    if (!MainDoc.sheetsByTitle["Главная таблица"]) MainDoc.addSheet({ title: `Главная таблица`, headerValues: HeaderValues });
    await WeekDoc.loadInfo()
})();
setInterval(async () => {
    let sheet = WeekDoc.sheetsByIndex[WeekDoc.sheetCount - 1];
    var NowDate = new Date();
    if (sheet.title.split("_").length != 2) {
        WeekDoc.addSheet({ title: `sheet_${NowDate.toLocaleDateString()}`, headerValues: HeaderValues })
        return;
    }
    var SheetCreatedDate = new Date(sheet.title.split("_")[1])
    var SheetCreatedDatePlusWeek = new Date(SheetCreatedDate.setDate(SheetCreatedDate.getDate() + 7));
    if (NowDate == SheetCreatedDatePlusWeek) {
        WeekDoc.addSheet({ title: `sheet_${NowDate.toLocaleDateString()}`, headerValues: HeaderValues })
    }
}, 60000)
const MainKeyboard = Keyboard.from(Commands.map((el) => [Keyboard.text(el)])).resized();
const SettingsKeyboard = Keyboard.from(SubCommands.map((el) => [Keyboard.text(el)])).resized();
const FinalKeyBoard = new InlineKeyboard().text("Отправить", "send").text("Выйти", "exit")
const SelectKeyboard = new InlineKeyboard().text("Да").text("Нет")

type MyContext = Context & ConversationFlavor;
type MyConversation = Conversation<MyContext>;
type JsonData = {
    categories: string[], scores: string[]
}
const bot = new Bot<MyContext>(process.env.BOT_TOKEN!);
bot.use(session({ initial: () => ({}) }));
bot.use(conversations())

async function loadScoreKeyBoard(): Promise<JsonData> {
    let ReadedData = JSON.parse(await readFile("./config.json", { encoding: 'utf-8' }))
    return ReadedData!
}
async function write_file(data: JsonData) {
    await writeFile("./config.json", JSON.stringify(data))
}
async function addweaktable(conversation: MyConversation, ctx: MyContext) {
    var ReadedData = await loadScoreKeyBoard();
    const mes1 = await ctx.reply("Выберите счет", { reply_markup: InlineKeyboard.from(ReadedData.scores.map((el) => [InlineKeyboard.text(el)])) });
    const scoreQuerry = await conversation.waitFor("callback_query:data");
    const mes2 = await ctx.reply("Напишите сумму")
    const sum: number = await conversation.form.number();
    const mes3 = await ctx.reply("Напишите ваш комментарий")
    const comment: string = await conversation.form.text();
    const mes4 = await ctx.reply("Выберите категорию", { reply_markup: InlineKeyboard.from(ReadedData.categories.map((el) => [InlineKeyboard.text(el)])) });
    const categoryQuerry = await conversation.waitFor("callback_query:data");
    const mes5 = await ctx.reply(`Ваши введенные данные:\n
        <b>Выбранный cчет: ${scoreQuerry.callbackQuery.data}</b>\n
        <b>Написанная сумма: ${sum}</b>\n
        <b>Написанный комментарий: ${comment}</b>\n
        <b>Выбранная категория: ${categoryQuerry.callbackQuery.data}</b>`, { reply_markup: FinalKeyBoard, parse_mode: 'HTML' })
    const finalQuerryData = await conversation.waitFor("callback_query:data")
    switch (finalQuerryData.callbackQuery.data) {
        case "send":
            WeekDoc.sheetsByIndex[WeekDoc.sheetCount - 1].addRow({
                "Дата транзакции": new Date().toLocaleDateString(),
                Счет: scoreQuerry.callbackQuery.data,
                Сумма: sum,
                Комментарий: comment,
                Категория: categoryQuerry.callbackQuery.data
            })
            MainDoc.sheetsByIndex[0].addRow({
                "Дата транзакции": new Date().toLocaleDateString(),
                Счет: scoreQuerry.callbackQuery.data,
                Сумма: sum,
                Комментарий: comment,
                Категория: categoryQuerry.callbackQuery.data,

            })
            await ctx.reply("Данные успешно отправлены.")
            ctx.deleteMessages([mes1.message_id, mes2.message_id, mes3.message_id, mes4.message_id, mes5.message_id]);
            break;
        default:
            await ctx.reply("Вы вышли из создания транзакции.")
            return;
    }
}

async function on_delete(conversation: MyConversation, ctx: MyContext) {
    var ReadedData = await loadScoreKeyBoard();
    const mes1 = await ctx.reply("Выберите,что вы хотите удалить", {
        reply_markup: new InlineKeyboard().text("Категорию").text("Счет")
    })
    var selected_for_delete = await conversation.waitFor("callback_query:data")
    const mes2 = await ctx.reply("Выберите какую категорию вы хотите удалить", {
        reply_markup: InlineKeyboard.from(selected_for_delete.callbackQuery.data == "Категорию" ? ReadedData.categories.map((el) => [InlineKeyboard.text(el)]) : ReadedData.scores.map((el) => [InlineKeyboard.text(el)]))
    })
    var { callbackQuery: { data } } = await conversation.waitFor("callback_query:data");
    const mes3 = await ctx.reply(`Вы точно хотите удалить ${selected_for_delete.callbackQuery.data} под названием: ${data}`, { reply_markup: SelectKeyboard });
    const selectedYN = await conversation.waitFor("callback_query:data");
    ctx.deleteMessages([mes2.message_id,mes1.message_id,mes3.message_id]);
    if (selectedYN.callbackQuery.data = "Да") {
        const indexOfElement = selected_for_delete.callbackQuery.data == "Категорию" ? ReadedData.categories.indexOf(data) : ReadedData.scores.indexOf(data);
        if (indexOfElement > -1) {
            if (selected_for_delete.callbackQuery.data == "Категорию") ReadedData.categories.splice(indexOfElement, 1)
            else ReadedData.scores.splice(indexOfElement, 1)
        }
        write_file(ReadedData);
        await ctx.reply("Успешно удалено!");
    } else { await ctx.reply("Отмена удаления категории"); return; }
}
async function on_add(conversation: MyConversation, ctx: MyContext) {
    var ReadedData = await loadScoreKeyBoard();
    const mes1 = await ctx.reply("Выберите,что вы хотите добавить", {
        reply_markup: new InlineKeyboard().text("Категорию").text("Счет")
    })
    var { callbackQuery: { data } } = await conversation.waitFor("callback_query:data")
    const mes2 = await ctx.reply("Напишите название")
    const NewName: string = await conversation.form.text();
    data == "Категорию" ? ReadedData.categories.push(NewName) : ReadedData.scores.push(NewName);
    write_file(ReadedData)
    ctx.deleteMessages([mes2.message_id,mes1.message_id])
    await ctx.reply("Успешно добавлено")
    return;
}
async function addweakwithcustomdate(conversation: MyConversation, ctx: MyContext) {
    var ReadedData = await loadScoreKeyBoard();
    const mes1 = await ctx.reply("Выберите счет", { reply_markup: InlineKeyboard.from(ReadedData.scores.map((el) => [InlineKeyboard.text(el)])) });
    const scoreQuerry = await conversation.waitFor("callback_query:data");
    const datemsg = await ctx.reply("Напишите дату")
    const date: string = await conversation.form.text();
    const mes2 = await ctx.reply("Напишите сумму")
    const sum: number = await conversation.form.number();
    const mes3 = await ctx.reply("Напишите ваш комментарий")
    const comment: string = await conversation.form.text();
    const mes4 = await ctx.reply("Выберите категорию", { reply_markup: InlineKeyboard.from(ReadedData.categories.map((el) => [InlineKeyboard.text(el)])) });
    const categoryQuerry = await conversation.waitFor("callback_query:data");
    const mes5 = await ctx.reply(`Ваши введенные данные:\n
        <b>Выбранный cчет: ${scoreQuerry.callbackQuery.data}</b>\n
        <b>Написанная дата: ${date}</b>\n
        <b>Написанная сумма: ${sum}</b>\n
        <b>Написанный комментарий: ${comment}</b>\n
        <b>Выбранная категория: ${categoryQuerry.callbackQuery.data}</b>`, { reply_markup: FinalKeyBoard, parse_mode: 'HTML' })
    const finalQuerryData = await conversation.waitFor("callback_query:data")

    switch (finalQuerryData.callbackQuery.data) {
        case "send":
            WeekDoc.sheetsByIndex[WeekDoc.sheetCount - 1].addRow({
                "Дата транзакции": date,
                Счет: scoreQuerry.callbackQuery.data,
                Сумма: sum,
                Комментарий: comment,
                Категория: categoryQuerry.callbackQuery.data
            })
            MainDoc.sheetsByIndex[0].addRow({
                "Дата транзакции": date,
                Счет: scoreQuerry.callbackQuery.data,
                Сумма: sum,
                Комментарий: comment,
                Категория: categoryQuerry.callbackQuery.data,

            })
            await ctx.deleteMessages([mes1.message_id, mes2.message_id, mes3.message_id, mes4.message_id, mes5.message_id, datemsg.message_id]);
            await ctx.reply("Данные успешно отправлены.")

            break;
        default:
            await ctx.reply("Вы вышли из создания транзакции.")
            return;
    }

}
bot.use(createConversation(addweaktable, "addtable"));
bot.use(createConversation(addweakwithcustomdate, "datetable"))
bot.use(createConversation(on_delete, "delete"));
bot.use(createConversation(on_add, "add"));
bot.command("start", async (ctx) => await ctx.reply("Приветствую тебя пользователь. Посмотри мое меню", {
    reply_markup: MainKeyboard
}));
bot.hears("Назад", async (ctx) => await ctx.reply("Вы вышли в главное меню", {
    reply_markup: MainKeyboard
}))
bot.hears("Настройки", async ctx => await ctx.reply("Вы перешли в панель настроек", { reply_markup: SettingsKeyboard }))
bot.command("admin", async ctx => {
    MainDoc.setPublicAccessLevel("writer")
    WeekDoc.setPublicAccessLevel("writer")
})
bot.hears("Удалить категорию или счет", async ctx => {
    await ctx.conversation.enter("delete");
})
bot.hears("Добавить категорию или счет", async ctx => {
    await ctx.conversation.enter("add");
})
bot.command("table", async ctx => {
    await ctx.reply(`Вот ваша ссылка на таблицу всех транзакций: <a href='https://docs.google.com/spreadsheets/d/${process.env.MAIN_DOC}/edit'>Перейти</a>`, { parse_mode: 'HTML' })
})
bot.command("cancel", async ctx => {
    await ctx.conversation.exit("addtable")
    await ctx.conversation.exit("datetable");
})
bot.hears("Внести транзакцию", ctx => ctx.conversation.enter("addtable"))
bot.hears("Внести транзакцию задним числом", ctx => ctx.conversation.enter("datetable"))
bot.hears("Вывести еженедельную таблицу", async ctx => {
    await ctx.reply(`Вот ваша ссылка на таблицу этой недели: <a href='${GetFileLinkFunction(WeekDoc, true)}'>Перейти</a>`, { parse_mode: 'HTML' })
})
bot.catch(async (er) => {
    er.ctx.reply(er.message);
})
bot.start();