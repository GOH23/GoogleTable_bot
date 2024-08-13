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
let ChatIds: string[] = [];
let AddNotificationFor: string[] = ["woodd_i", "llicette", "goh222"]
let WeekDoc: GoogleSpreadsheet;
let MainDoc: GoogleSpreadsheet;
let maxseconds = { maxMilliseconds: 100000 }
const locates = "ru-RU"
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
type NotType = "add_category" | "delete_category" | "add_score" | "delete_score" | "add_transaction"
const NotificationSend = (NotifType: NotType) => {
    ChatIds.forEach(async element => {
        await bot.api.sendMessage(element,
            NotifType == "add_category" ? "Добавлена новая категория!" :
                NotifType == "add_score" ? "Добавлен новый счет!" :
                    NotifType == "add_transaction" ? "Добавлена новая транзакция" :
                        NotifType == "delete_category" ? "Удалена категория" :
                            NotifType == "delete_score" ? "Удален счет!" : "")
    });
}
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
        WeekDoc.addSheet({ title: `sheet_${NowDate.toLocaleDateString(locates)}`, headerValues: HeaderValues })
        return;
    }
    var SheetCreatedDate = new Date(sheet.title.split("_")[1])
    var SheetCreatedDatePlusWeek = new Date(SheetCreatedDate.setDate(SheetCreatedDate.getDate() + 7));
    if (NowDate == SheetCreatedDatePlusWeek) {
        WeekDoc.addSheet({ title: `sheet_${NowDate.toLocaleDateString(locates)}`, headerValues: HeaderValues })
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
const getMessage = (data: { score: string, sum: string, comment: string, category: string, date?: string },user?: {ctx: MyContext}): string => {
    const { score, sum, category, comment, date } = data
    return `${user ? `Пользователь <a href="tg://user?id=${user.ctx.chat?.id}">${user.ctx.chat?.username}</a> добавил транзакцию` : `Ваши введенные данные:`} \n
        <b>Выбранный cчет: <code>${score}</code></b>\n
        <b>Написанная сумма: <code>${sum}</code></b>\n
        ${date ? `<b>Написанная дата: <code>${date}</code></b>\n` : ``}
        <b>Написанный комментарий: <code>${comment}</code></b>\n
        <b>Выбранная категория: <code>${category}</code></b>`;
}
async function write_file(data: JsonData) {
    await writeFile("./config.json", JSON.stringify(data))
}
async function addweaktable(conversation: MyConversation, ctx: MyContext) {
    var ReadedData = await loadScoreKeyBoard();
    const mes1 = await ctx.reply("Выберите счет", { reply_markup: InlineKeyboard.from(ReadedData.scores.map((el) => [InlineKeyboard.text(el)])) });
    const scoreQuerry = await conversation.waitFor("callback_query:data");
    const mes2 = await ctx.reply("Напишите сумму")
    var sumAnswerMessage = await conversation.wait({ ...maxseconds });
    const sum: string = sumAnswerMessage.message?.text!;
    const mes3 = await ctx.reply("Напишите ваш комментарий")
    var commentAnswerMessage = await conversation.wait({ ...maxseconds });
    const comment: string = commentAnswerMessage.message?.text!;
    const mes4 = await ctx.reply("Выберите категорию", { reply_markup: InlineKeyboard.from(ReadedData.categories.map((el) => [InlineKeyboard.text(el)])) });
    const categoryQuerry = await conversation.waitFor("callback_query:data");
    /*
    `Ваши введенные данные:\n
        <b>Выбранный cчет: <code>${scoreQuerry.callbackQuery.data}</code></b>\n
        <b>Написанная сумма: <code>${sum}</code></b>\n
        <b>Написанный комментарий: <code>${comment}</code></b>\n
        <b>Выбранная категория: <code>${categoryQuerry.callbackQuery.data}</code></b>`
    */
    const mes5 = await ctx.reply( getMessage({score: scoreQuerry.callbackQuery.data,sum: sum,comment: comment,category: categoryQuerry.callbackQuery.data}), { reply_markup: FinalKeyBoard, parse_mode: 'HTML' })
    const finalQuerryData = await conversation.waitFor("callback_query:data")
    switch (finalQuerryData.callbackQuery.data) {
        case "send":
            WeekDoc.sheetsByIndex[WeekDoc.sheetCount - 1].addRow({
                "Дата транзакции": new Date().toLocaleDateString(locates),
                Счет: scoreQuerry.callbackQuery.data,
                Сумма: sum,
                Комментарий: comment,
                Категория: categoryQuerry.callbackQuery.data
            })
            MainDoc.sheetsByIndex[0].addRow({
                "Дата транзакции": new Date().toLocaleDateString(locates),
                Счет: scoreQuerry.callbackQuery.data,
                Сумма: sum,
                Комментарий: comment,
                Категория: categoryQuerry.callbackQuery.data,

            })
            /*
            `Пользователь <a href="tg://user?id=${ctx.chat?.id}">${ctx.chat?.username}</a> добавил транзакцию\n
                <b>Выбранный cчет: <code>${scoreQuerry.callbackQuery.data}</code></b>\n
                <b>Написанная сумма: <code>${sum}</code></b>\n
                <b>Написанный комментарий: <code>${comment}</code></b>\n
                <b>Выбранная категория: <code>${categoryQuerry.callbackQuery.data}</code></b>`
            */
            await ctx.reply(getMessage({score: scoreQuerry.callbackQuery.data,sum: sum,comment: comment,category: categoryQuerry.callbackQuery.data},{ctx}), { parse_mode: 'HTML' })
            NotificationSend("add_transaction");
            ctx.deleteMessages([mes1.message_id, mes2.message_id, mes3.message_id, mes4.message_id, mes5.message_id, sumAnswerMessage.msgId!, commentAnswerMessage.msgId!]);
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
    ctx.deleteMessages([mes2.message_id, mes1.message_id, mes3.message_id]);
    if (selectedYN.callbackQuery.data = "Да") {
        const indexOfElement = selected_for_delete.callbackQuery.data == "Категорию" ? ReadedData.categories.indexOf(data) : ReadedData.scores.indexOf(data);
        if (indexOfElement > -1) {
            if (selected_for_delete.callbackQuery.data == "Категорию") ReadedData.categories.splice(indexOfElement, 1)
            else ReadedData.scores.splice(indexOfElement, 1)
        }
        write_file(ReadedData);
        NotificationSend(data == "Категорию" ? "delete_category" : "delete_score");
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
    ctx.deleteMessages([mes2.message_id, mes1.message_id])
    NotificationSend(data == "Категорию" ? "add_category" : "add_score");
    await ctx.reply("Успешно добавлено")
    return;
}
async function addweakwithcustomdate(conversation: MyConversation, ctx: MyContext) {
    var ReadedData = await loadScoreKeyBoard();
    const mes1 = await ctx.reply("Выберите счет", { reply_markup: InlineKeyboard.from(ReadedData.scores.map((el) => [InlineKeyboard.text(el)])) });
    const scoreQuerry = await conversation.waitFor("callback_query:data", { ...maxseconds });
    const datemsg = await ctx.reply("Напишите дату")
    var dateAnswerMessage = await conversation.wait({ ...maxseconds });
    const date: string = dateAnswerMessage.message?.text!;
    const mes2 = await ctx.reply("Напишите сумму")
    var sumAnswerMessage = await conversation.wait({ ...maxseconds });
    const sum: string = sumAnswerMessage.message?.text!;
    const mes3 = await ctx.reply("Напишите ваш комментарий")
    var commentAnswerMessage = await conversation.wait({ ...maxseconds });
    const comment: string = commentAnswerMessage.message?.text!;
    const mes4 = await ctx.reply("Выберите категорию", { reply_markup: InlineKeyboard.from(ReadedData.categories.map((el) => [InlineKeyboard.text(el)])) });
    const categoryQuerry = await conversation.waitFor("callback_query:data");
    const mes5 = await ctx.reply(getMessage({score: scoreQuerry.callbackQuery.data,sum: sum,comment: comment,category: categoryQuerry.callbackQuery.data,date: date}), { reply_markup: FinalKeyBoard, parse_mode: 'HTML' });

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
            await ctx.deleteMessages([mes1.message_id, mes2.message_id, mes3.message_id, mes4.message_id, mes5.message_id, datemsg.message_id, sumAnswerMessage.msgId!, commentAnswerMessage.msgId!, dateAnswerMessage.msgId!]);
            NotificationSend("add_transaction");
            await ctx.reply(getMessage({score: scoreQuerry.callbackQuery.data,sum: sum,comment: comment,category: categoryQuerry.callbackQuery.data,date: date},{ctx}), { parse_mode: 'HTML' })
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
bot.command("start", async (ctx) => {
    const { message_id } = await ctx.reply("Приветствую тебя пользователь. Посмотри мое меню", {
        reply_markup: MainKeyboard
    })
    setTimeout(async () => {
        await ctx.deleteMessages([message_id]);
    }, 2000)
});
bot.hears("Назад", async (ctx) => await ctx.reply("Вы вышли в главное меню", {
    reply_markup: MainKeyboard
}))
bot.hears("Настройки", async ctx => await ctx.reply("Вы перешли в панель настроек", { reply_markup: SettingsKeyboard }))
bot.hears("Удалить категорию или счет", async ctx => {
    await ctx.conversation.enter("delete");
})
bot.hears("Добавить категорию или счет", async ctx => {
    await ctx.conversation.enter("add");
})
bot.command("table", async ctx => {
    await ctx.reply(`Вот ваша ссылка на таблицу всех транзакций: <a href='https://docs.google.com/spreadsheets/d/${process.env.MAIN_DOC}/edit'>Перейти</a>`, { parse_mode: 'HTML' })
})
bot.command("update_notifications", async ctx => {
    if (AddNotificationFor.indexOf(ctx.chat.username!) > -1) {
        if (ChatIds.indexOf(ctx.chat.id.toString()) == -1) {
            ChatIds.push(ctx.chat.id.toString());
            await ctx.reply("Вы обновили систему уведомлений, пока сессия бота активна.");
        } else {
            await ctx.reply("Вы уже добавлены в систему уведомлений, пока сессия бота активна.");
        }

    } else {
        await ctx.reply("У вас нет прав на использование этой команды.");
    }

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