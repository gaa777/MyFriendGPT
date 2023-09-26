import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
  userId: {type: Number, unique: true, required: true},
  username: {type: String},
  firstName: {type: String},
  lastName: {type: String},  
})

const User = mongoose.model('User', userSchema)

export default User
