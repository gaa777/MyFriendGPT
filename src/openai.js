import OpenAI from 'openai'
import Whisper from 'whisper-nodejs'
import config from 'config'
import { createReadStream } from 'fs'

class NewOpenAi {
    roles = {
        ASSISTANT: 'assistant',
        USER: 'user',
        SYSTEM: 'system',
      }

    constructor(apiKey) {
        this.openai = new OpenAI({ apiKey: apiKey })    
        this.whisper = new Whisper(apiKey)    
    }
    async chat(messages) {
        try {
            const response = await this.openai.chat.completions.create({              
              model: 'gpt-3.5-turbo', 
              messages: messages,             
            })
            console.log(response.choices[0].message.content)
            return response.choices[0].message.content            
          } catch (e) {
            console.log('Error while gpt chat', e.message)
          }
    }

    async transcription(filepath) {
        try {
            return await this.whisper.transcribe(filepath, 'whisper-1')
            .then(text => {
                console.log(text);
                return text
            })     
        } catch (e) {
        console.log('Error while transcription', e.message)
        }
    }
}
export const openai = new NewOpenAi(config.get('OPENAI_KEY'))