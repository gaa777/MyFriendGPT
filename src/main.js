import { Telegraf, session } from 'telegraf'
import { message } from 'telegraf/filters'
import { code } from 'telegraf/format'
import config from 'config'
import { ogg } from './ogg.js'
import { openai } from './openai.js'
import { mongoose } from 'mongoose'
import User from '../models/User.js'

const newUserAdd = async(userId, username, firstName, lastName) => {  
  console.log('User: ', userId, username, firstName, lastName)
  const existingUser = await User.findOne({ userId })
  if (!existingUser) {
    // Если пользователя нет в базе данных, сохраняем его
    console.log('Add new user, id: ', userId)
    const newUser = new User({
      userId,
      username,
      firstName,
      lastName,
    })

    try {
      await newUser.save();
      console.log('User saved successfully.');
    } catch (err) {
      console.error('Error saving user:', err);
    }
  }
}

mongoose.connect(config.get('MONGO_SRV'), {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})

const db = mongoose.connection

db.on('error', console.error.bind(console, 'MongoDB connection error:'))
db.once('open', () => {
  console.log('Connected to MongoDB')
})

const bot = new Telegraf(config.get('TELEGRAM_TOKEN'))

const userSessions = {}; 

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
    ctx.session = {
        messages: [],
      }
    await ctx.reply('Жду вашего голосового или текстового сообщения')

    const userId = ctx.message.from.id
    const username = ctx.message.from.username
    const firstName = ctx.message.from.first_name
    const lastName = ctx.message.from.last_name
    newUserAdd(userId, username, firstName, lastName)
})
bot.command('start', async (ctx) => {    
    ctx.session = {
        messages: [],
      }
    await ctx.reply('Жду вашего голосового или текстового сообщения')

    const userId = ctx.message.from.id
    const username = ctx.message.from.username
    const firstName = ctx.message.from.first_name
    const lastName = ctx.message.from.last_name
    newUserAdd(userId, username, firstName, lastName)
})

bot.on(message('text'), async (ctx) => {    
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