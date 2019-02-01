const dsteem = require('eftg-dsteem')
const crypto = require('crypto')
const axios = require('axios')
const FormData = require('form-data')
const fs = require('fs')
const config = require('./config.js')

/**
 * Creates a hash of a file, sign it using the private key, 
 * and uploads the file with the signature to the Hoster
 */
async function uploadFile (filename, username, privKey) {
  const filedata = fs.readFileSync(filename)

  const imageHash = crypto.createHash('sha256')
    .update('ImageSigningChallenge')
    .update(filedata)
    .digest()
  const signature = privKey.sign(imageHash).toString()
  const urlWithSignature = `${ config.IMAGE_HOSTER }/${ username }/${ signature }`
    
  // Upload file
  let form = new FormData()
  form.append('file', fs.createReadStream(filename))
    
  var response = await axios({
       method: 'post',
       url: urlWithSignature,
       data: form,
       headers: form.getHeaders()
     })
           
  return response.data.url;
}

/**
 * Generate a post using the format for OAM publications 
 */
function generatePost (username, data) {
  // Definition of the link to the post
  var permlink = data.title.toLowerCase().replace(/\s+/g, "-").replace(/[^0-9a-z-]/gi, "")
  // optional: add random string to permlink
  permlink = Math.random().toString(36).substring(7) + '-' + permlink
  
  var body = '[[pdf link]](' + data.url + ')'

  var json_metadata = {
    issuer_name:       data.issuer_name,
    home_member_state: data.home_member_state,
    identifier_id:     data.identifier_id,
    identifier_value:  data.identifier_value,
    subclass:          data.subclass,
    disclosure_date:   data.disclosure_date,
    submission_date:   data.submission_date,
    document_language: data.document_language,
    comment:           data.title,
    financial_year:    data.financial_year,
    type_submission:   data.type_submission,
    tags:              [ data.subclassTag,
                         data.issuer_name,
                         data.home_member_state,
                         data.identifier_value
                       ],
    storage_date:      data.storage_date,
    permlink:          permlink,
    app:               config.APP_VERSION,
  }

  return {
    author: username,
    body: body,
    json_metadata: JSON.stringify(json_metadata),
    parent_author: '',
    parent_permlink: 'oam',
    permlink: permlink,
    title: data.title
  }
}

/**
 * Defines a new transaction without operations
 */
async function newTransaction() {
  var client = new dsteem.Client(config.RPC_NODE)
      
  const dgp = await client.database.getDynamicGlobalProperties()
      
  var head_block_number = dgp.head_block_number;
  var head_block_id = dgp.head_block_id;
  var prefix = Buffer.from(head_block_id, 'hex').readUInt32LE(4);
         
  var expireTime = 3590 * 1000;
  var expiration = new Date(Date.now() + expireTime).toISOString().slice(0, -5)
      
  return {
    ref_block_num: head_block_number,
    ref_block_prefix: prefix,
    expiration: expiration,
    operations: [],
    extensions: []
  }
}

async function publishBulk(data, username, privKey){
  const client = new dsteem.Client(config.RPC_NODE)

  const storage_date = new Date().toISOString().slice(0, -5)
  
  for(var i in data){    
    try{
      // Load and sign file
      data[i].url = await uploadFile(data[i].filename, username, privKey)
      data[i].storage_date = storage_date
      
      // Create the post
      var post = generatePost(username,data[i])
      
      var responsePost = await client.broadcast.comment(post, privKey);
      console.log(`New document published!! [${parseInt(i)+1}/${data.length}]`)
      console.log(`permlink: @${config.username}/${post.permlink}`)      
    }catch(error){
      console.log(`Error with entry number ${parseInt(i)+1}. Details:`)
      console.log(error)
    }
  }
}

async function publishOneTrx(data, username, privKey){
  const client = new dsteem.Client(config.RPC_NODE)

  const storage_date = new Date().toISOString().slice(0, -5)
  
  var operations = []
  
  for(var i in data){    
    try{
      // Load and sign file
      data[i].url = await uploadFile(data[i].filename, username, privKey)
      data[i].storage_date = storage_date
      
      // Create the post
      var post = generatePost(username,data[i])
      
      operations.push(['comment',post])      
      
    }catch(error){
      console.log(error)
      console.log(`Error uploading file number ${parseInt(i)+1}. Details:`)
      console.log(error.response.statusText)
      console.log(error.response.data)      
    }
  }  
  
  try{
    var trx = await newTransaction()
    trx.operations = operations
    var sgnTrx = client.broadcast.sign(trx , privKey);
    response = await client.broadcast.send(sgnTrx)
    
    console.log(`${parseInt(operations.length)} documents published!!\nPermlinks:`)
    for(var i in operations){
      console.log(`@${operations[i][1].author}/@${operations[i][1].permlink}`)
    }    
  }catch(error){
    console.log(`Error broadcasting documents to the blockchain. Details:`)
    console.log(error)
  }
}

module.exports = {
  publishBulk,
  publishOneTrx
}