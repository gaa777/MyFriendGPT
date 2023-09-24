import { Telegraf, session } from 'telegraf'
import { message } from 'telegraf/filters'
import { code } from 'telegraf/format'
import config from 'config'
import { ogg } from './ogg.js'
import { openai } from './openai.js'

const bot = new Telegraf(config.get('TELEGRAM_TOKEN'))
const userSessions = {}; // Store user sessions in memory
// const INITIAL_SESSION = {
//     messages: [],
//   }

// говорим боту, чтобы он использовал session
//bot.use(session())

bot.use(async (ctx, next) => {
    const userId = String(ctx.from.id);
  
    if (!userSessions[userId]) {
      userSessions[userId] = {
        messages: [],
      };
    }
  
    ctx.session = userSessions[userId];
  
    await next();
  });

// при вызове команды new и start бот регистрирует новую беседу,
// новый контекст
bot.command('new', async (ctx) => {
    //ctx.session = INITIAL_SESSION
    ctx.session = {
        messages: [],
      }
    await ctx.reply('Жду вашего голосового или текстового сообщения')
})
bot.command('start', async (ctx) => {
    //ctx.session = INITIAL_SESSION
    ctx.session = {
        messages: [],
      }
    await ctx.reply('Жду вашего голосового или текстового сообщения')
})

bot.on(message('text'), async (ctx) => {
    //ctx.session ??= INITIAL_SESSION
    //await ctx.reply(JSON.stringify(ctx.message, null, 2))
    try {
        await ctx.reply(code('Сообщение принял. Жду ответ от сервера...'))        
            
		ctx.session.messages.push({
            role: openai.roles.USER, 
            content: ctx.message.text
        })

        const response = await openai.chat(ctx.session.messages)      

        ctx.session.messages.push({
            role: openai.roles.ASSISTANT, 
            content: response
        })  

        await ctx.reply(response)
      } catch (e) {
            console.log(`Error while text message`, e.message)
      }
})

bot.on(message('voice'), async (ctx) => {
    //ctx.session ??= INITIAL_SESSION
    try {
        await ctx.reply(code('Сообщение принял. Жду ответ от сервера...'))
        const link = await ctx.telegram.getFileLink(ctx.message.voice.file_id)
        const userId = String(ctx.message.from.id)
        const oggPath = await ogg.create(link.href, userId)
        const mp3Path = await ogg.toMp3(oggPath, userId)
        const text = await openai.transcription(mp3Path)
        await ctx.reply(code(`Ваш запрос: ${text}`))
		ctx.session.messages.push({role: openai.roles.USER, content: text})
        const response = await openai.chat(ctx.session.messages)      
        ctx.session.messages.push({role: openai.roles.ASSISTANT, content: response})  
        await ctx.reply(response)
      } catch (e) {
            console.log(`Error while voice message`, e.message)
      }
})

bot.launch()
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))