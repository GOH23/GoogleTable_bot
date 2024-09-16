import { Bot, Context, GrammyError, HttpError, InlineKeyboard, Keyboard, session } from "grammy";
import { config } from "dotenv";
import { GoogleSpreadsheet, GoogleSpreadsheetRow } from 'google-spreadsheet';
import { JWT } from "google-auth-library"
import _ from 'lodash'
import { readFile, writeFile } from 'fs/promises'
import {
    type Conversation,
    type ConversationFlavor,
    conversations,
    createConversation,
} from "@grammyjs/conversations";
config()

let Notification: string[] = ["goh222", "woodd_i"]
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
const NotificationSend = async (NotifType: NotType) => {
    var data = await loadScoreKeyBoard()
    data.user.forEach(async element => {
        if (Notification.find((el) => el == element.username)) {
            await bot.api.sendMessage(element.chat_id,
                NotifType == "add_category" ? "Добавлена новая категория!" :
                    NotifType == "add_score" ? "Добавлен новый счет!" :
                        NotifType == "add_transaction" ? "Добавлена новая транзакция" :
                            NotifType == "delete_category" ? "Удалена категория" :
                                NotifType == "delete_score" ? "Удален счет!" : "")
        }

    });
}
function isDateValid(dateStr: string) {
    try {
        var dateSplit = dateStr.trim().split(".")
        if (dateSplit.length != 3) {
            return false;
        }
        return !isNaN(Date.parse(`${dateSplit[2]}.${dateSplit[1]}.${dateSplit[0]}`));
    } catch {
        return false;
    }
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
    var dateSplit = sheet.title.split("_")[1].trim().split(".")
    var SheetCreatedDate = new Date(`${dateSplit[2]}.${dateSplit[1]}.${dateSplit[0]}`)
    SheetCreatedDate.setDate(SheetCreatedDate.getDate() + 7);
    if (NowDate >= SheetCreatedDate) {
        WeekDoc.addSheet({ title: `sheet_${NowDate.toLocaleDateString(locates)}`, headerValues: HeaderValues })
    }
    if (`${NowDate.getHours()}:${NowDate.getMinutes()}:${getFormatedSeconds(NowDate.getSeconds())}` == "21:0:15") {
        var data = await loadScoreKeyBoard()
        data.user.forEach(element => {
            if (Notification.find((el) => el == element.username)) {
                if (NowDate.getDay() == 7) {
                    bot.api.sendMessage(element.chat_id, "<b>Уведомление о внесении в журнал операций!</b>", { parse_mode: 'HTML' });
                }
            }
            bot.api.sendMessage(element.chat_id, "<b>Ежедневное упоминание о добавлении транзакции!</b>", { parse_mode: 'HTML' });
        });
    }
}, 5000)
function getFormatedSeconds(params: number) {
    var num = params % 10
    return num != 0 ? num <= 5 ? params += 5 - num : params += 10 - num : params <= 5 ? 5 : 10
}
const MainKeyboard = Keyboard.from(Commands.map((el) => [Keyboard.text(el)])).resized();
const SettingsKeyboard = Keyboard.from(SubCommands.map((el) => [Keyboard.text(el)])).resized();
const FinalKeyBoard = new InlineKeyboard().text("Отправить", "send").text("Выйти", "exit")
const SelectKeyboard = new InlineKeyboard().text("Да").text("Нет")

type MyContext = Context & ConversationFlavor;
type MyConversation = Conversation<MyContext>;
type UserType = { username: string | undefined, chat_id: number }
type JsonData = {
    categories: string[], scores: string[], user: UserType[]
}
const bot = new Bot<MyContext>(process.env.BOT_TOKEN!);
bot.api.setMyCommands([
    { command: "start", description: "Вывести главное меню бота" },
    { command: "table", description: "Вывести главную таблицу" },
    { command: "edit", description: "Изменить данные в еженедельной таблице" },
    { command: 'sort', description: "Отсортировать таблицу" }
]);
bot.use(session({ initial: () => ({}) }));
bot.use(conversations())

async function loadScoreKeyBoard(): Promise<JsonData> {
    let ReadedData = JSON.parse(await readFile("./config.json", { encoding: 'utf-8' }))
    return ReadedData!
}
const getMessage = (data: { score: string, sum: string, comment: string, category: string, date?: string }, user?: { ctx: MyContext }): string => {
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
    const mes5 = await ctx.reply(getMessage({ score: scoreQuerry.callbackQuery.data, sum: sum, comment: comment, category: categoryQuerry.callbackQuery.data }), { reply_markup: FinalKeyBoard, parse_mode: 'HTML' })
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

            await ctx.reply(getMessage({ score: scoreQuerry.callbackQuery.data, sum: sum, comment: comment, category: categoryQuerry.callbackQuery.data }, { ctx }), { parse_mode: 'HTML' })
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
    const scoreQuerry = await conversation.waitFor("callback_query:data");
    do {
        var datemsg = await ctx.reply("Напишите дату")
        var dateAnswerMessage = await conversation.wait();
        var date: string = dateAnswerMessage.message?.text!;
        if (!isDateValid(date)) { ctx.deleteMessages([dateAnswerMessage.msgId!, datemsg.message_id]) }
    } while (!isDateValid(date))
    var mes2 = await ctx.reply("Напишите сумму")
    var sumAnswerMessage = await conversation.wait();
    const sum: string = sumAnswerMessage.message?.text!;
    const mes3 = await ctx.reply("Напишите ваш комментарий")
    var commentAnswerMessage = await conversation.wait();
    const comment: string = commentAnswerMessage.message?.text!;
    const mes4 = await ctx.reply("Выберите категорию", { reply_markup: InlineKeyboard.from(ReadedData.categories.map((el) => [InlineKeyboard.text(el)])) });
    const categoryQuerry = await conversation.waitFor("callback_query:data");
    const mes5 = await ctx.reply(getMessage({ score: scoreQuerry.callbackQuery.data, sum: sum, comment: comment, category: categoryQuerry.callbackQuery.data, date: date }), { reply_markup: FinalKeyBoard, parse_mode: 'HTML' });

    const finalQuerryData = await conversation.waitFor("callback_query:data")

    switch (finalQuerryData.callbackQuery.data) {
        case "send":
            Promise.all([await WeekDoc.sheetsByIndex[WeekDoc.sheetCount - 1].addRow({
                "Дата транзакции": date,
                Счет: scoreQuerry.callbackQuery.data,
                Сумма: sum,
                Комментарий: comment,
                Категория: categoryQuerry.callbackQuery.data
            }),
            await MainDoc.sheetsByIndex[0].addRow({
                "Дата транзакции": date,
                Счет: scoreQuerry.callbackQuery.data,
                Сумма: sum,
                Комментарий: comment,
                Категория: categoryQuerry.callbackQuery.data,
            })])



            await ctx.deleteMessages([mes1.message_id, mes2.message_id, mes3.message_id, mes4.message_id, mes5.message_id, datemsg.message_id, sumAnswerMessage.msgId!, commentAnswerMessage.msgId!, dateAnswerMessage.msgId!]);
            NotificationSend("add_transaction");
            await ctx.reply(getMessage({ score: scoreQuerry.callbackQuery.data, sum: sum, comment: comment, category: categoryQuerry.callbackQuery.data, date: date }, { ctx }), { parse_mode: 'HTML' })
            break;
        default:
            await ctx.deleteMessages([mes1.message_id, mes2.message_id, mes3.message_id, mes4.message_id, mes5.message_id, datemsg.message_id, sumAnswerMessage.msgId!, commentAnswerMessage.msgId!, dateAnswerMessage.msgId!]);
            await ctx.reply("Вы вышли из создания транзакции.")
            return;
    }

}
async function on_edit(conversation: MyConversation, ctx: MyContext) {
    var ReadedData = await loadScoreKeyBoard();
    var sheet = WeekDoc.sheetsByIndex[WeekDoc.sheetCount - 1];
    const rows = (await sheet.getRows())
    var rowMessage = "Выберите транзакцию по айди из списка\n"
    rowMessage += `Id `
    HeaderValues.map((el) => {
        rowMessage += `${el} `
    })
    rowMessage += "\n"
    rows.map((el, ind) => {
        rowMessage += `<b>${ind} ${el.get("Дата транзакции")} ${el.get("Счет")} ${el.get("Сумма")} ${el.get("Комментарий")} ${el.get("Категория")}</b>\n`
    })
    const mes1 = await ctx.reply(rowMessage, { parse_mode: 'HTML' });
    var row: GoogleSpreadsheetRow<Record<string, any>> = rows[await conversation.form.number()]
    ctx.deleteMessages([mes1.message_id])
    const loop = true
    do {
        var selectedQuerry: string;
        const mes2 = await ctx.reply("Выберите что вы хотите изменить??", {
            reply_markup: InlineKeyboard.from([
                [InlineKeyboard.text('Дата транзакции')],
                [InlineKeyboard.text('Счет')],
                [InlineKeyboard.text('Сумма')],
                [InlineKeyboard.text('Комментарий')],
                [InlineKeyboard.text('Категория')],
                [InlineKeyboard.text('Выйти из цикла редактирования')]
            ])
        })

        const { callbackQuery } = await conversation.waitFor("callback_query:data", { ...maxseconds });
        selectedQuerry = callbackQuery.data;
        ctx.deleteMessages([mes2.message_id])
        if (selectedQuerry == 'Выйти из цикла редактирования') {
            return;
        } else {
            const mes3 = await ctx.reply(`Вы хотите изменить \"${selectedQuerry}\"`, {
                reply_markup: selectedQuerry == "Счет" || selectedQuerry == "Категория" ? InlineKeyboard.from(
                    selectedQuerry == "Счет" ? ReadedData.scores.map((el) => [InlineKeyboard.text(el)])
                        : ReadedData.categories.map((el) => [InlineKeyboard.text(el)])
                ) : undefined
            })

            var data = await conversation.wait({ ...maxseconds });

            row.set(selectedQuerry, data.message?.text ?? data.callbackQuery?.data)
            await row.save();
            ctx.deleteMessages([mes3.message_id])

        }
    } while (loop)

}
bot.use(createConversation(addweaktable, "addtable"));
bot.use(createConversation(addweakwithcustomdate, "datetable"))
bot.use(createConversation(on_delete, "delete"));
bot.use(createConversation(on_add, "add"));
bot.use(createConversation(on_edit, 'edit'))
bot.command("start", async (ctx) => {
    const { message_id, chat: { id, username } } = await ctx.reply("Приветствую тебя пользователь. Посмотри мое меню", {
        reply_markup: MainKeyboard
    })
    var data = await loadScoreKeyBoard()
    var finded_data = data.user?.find((el) => el.username == username);
    if (finded_data) {
        finded_data.chat_id = id;
    } else {
        if (!data.user) data.user = []
        data.user.push({ chat_id: id, username: username })
    }
    await write_file(data)
    setTimeout(async () => {
        await ctx.deleteMessages([message_id]);
    }, 2000)
});
bot.command("edit", async ctx => {
    await ctx.conversation.enter('edit');
})
bot.command("sort", async ctx => {
    var sheet = WeekDoc.sheetsByIndex[WeekDoc.sheetCount - 1];
    var main_sheet = MainDoc.sheetsByIndex[0];
    const rows = (await sheet.getRows())
    const main_rows = (await main_sheet.getRows())
    const sortedRows = rows.sort((a, b) => {
        var elemA: string = a.get("Дата транзакции")
        var elemB: string = b.get("Дата транзакции")
        var dateSplitA = elemA.trim().split(".")
        var dateSplitB = elemB.trim().split(".")
        var dateA = new Date(`${dateSplitA[2]}.${dateSplitA[1]}.${dateSplitA[0]}`).getTime()
        var dateB = new Date(`${dateSplitB[2]}.${dateSplitB[1]}.${dateSplitB[0]}`).getTime();
        return dateA - dateB;
    });
    // const sortedRows = rows.sort((a, b) => {
    //     var dateA = new Date(a.get("Дата транзакции")).getTime();
    //     var dateB = new Date(b.get("Дата транзакции")).getTime();
    //     return dateA - dateB
    // });
    // const main_sortedRows = _.sortBy(main_rows, (element) => {
    //     var elem: string = element.get("Дата транзакции")
    //     var dateSplit = elem.trim().split(".")
    //     var SheetCreatedDate = new Date(`${dateSplit[2]}.${dateSplit[1]}.${dateSplit[0]}`)
    //     return SheetCreatedDate
    // })
    const main_sortedRows = main_rows.sort((a, b) => {
        var elemA: string = a.get("Дата транзакции")
        var elemB: string = b.get("Дата транзакции")
        var dateSplitA = elemA.trim().split(".")
        var dateSplitB = elemB.trim().split(".")
        var dateA = new Date(`${dateSplitA[2]}.${dateSplitA[1]}.${dateSplitA[0]}`).getTime()
        var dateB = new Date(`${dateSplitB[2]}.${dateSplitB[1]}.${dateSplitB[0]}`).getTime();
        return dateA - dateB;
    });
    await sheet.clear();
    await main_sheet.clear();
    await sheet.setHeaderRow(HeaderValues);
    await main_sheet.setHeaderRow(HeaderValues);
    Promise.all([await sheet.addRows(sortedRows.map((el) => {
        return {
            "Дата транзакции": el.get("Дата транзакции"),
            Счет: el.get("Счет"),
            Сумма: el.get("Сумма"),
            Комментарий: el.get("Комментарий"),
            Категория: el.get("Категория")
        }
    })), await main_sheet.addRows(main_sortedRows.map((el) => {
        return {
            "Дата транзакции": el.get("Дата транзакции"),
            Счет: el.get("Счет"),
            Сумма: el.get("Сумма"),
            Комментарий: el.get("Комментарий"),
            Категория: el.get("Категория")
        }
    }))])
    const { message_id } = await ctx.reply("Успешная сортировка")
    setTimeout(async () => {
        await ctx.deleteMessages([message_id]);
    }, 2000)
})
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
// bot.command("update_notifications", async ctx => {
//     if (AddNotificationFor.indexOf(ctx.chat.username!) > -1) {
//         if (ChatIds.indexOf(ctx.chat.id.toString()) == -1) {
//             ChatIds.push(ctx.chat.id.toString());
//             await ctx.reply("Вы обновили систему уведомлений, пока сессия бота активна.");
//         } else {
//             await ctx.reply("Вы уже добавлены в систему уведомлений, пока сессия бота активна.");
//         }

//     } else {
//         await ctx.reply("У вас нет прав на использование этой команды.");
//     }

// })
bot.command("cancel", async ctx => {
    await ctx.conversation.exit("addtable")
    await ctx.conversation.exit("datetable");
})
bot.hears("Внести транзакцию", async ctx => {
    await ctx.conversation.enter("addtable")
    await ctx.deleteMessage()
})
bot.hears("Внести транзакцию задним числом", async ctx => {

    await ctx.conversation.enter("datetable")
    await ctx.deleteMessage()
})
bot.hears("Вывести еженедельную таблицу", async ctx => {
    await ctx.reply(`Вот ваша ссылка на таблицу этой недели: <a href='${GetFileLinkFunction(WeekDoc, true)}'>Перейти</a>`, { parse_mode: 'HTML' })
})
bot.catch((err) => {
    const ctx = err.ctx;
    ctx.reply(`Error while handling update ${ctx.update.update_id}:`); const e = err.error;
    if (e instanceof GrammyError) {
        ctx.reply('Ошибка: ' + e.description);
    } else if (e instanceof HttpError) {
        ctx.reply('Ошибка: ' + e.message);
    } else {

    }
});
bot.start();