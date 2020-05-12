var QRCode = require('qrcode');
const CRC = require('crc-full').CRC;
var crc = CRC.default("CRC16_CCITT_FALSE");
var inquirer = require('inquirer');

//CLI Settings
var questions = [{
    type: 'list',
    name: 'proxyType',
    message: 'Are you using a UEN or Phone Number?',
    choices: ['UEN', 'Phone Number'],
    filter: function(val) {
      if (val === 'Phone Number') {
        return "mobile";
      } else {
        return "uen";
      }
    }
  },
  {
    type: 'input',
    name: 'proxyNumber',
    message: "What's your UEN/phone number?",
  },
  {
    type: 'list',
    name: 'edit',
    message: 'Do you want your payment amount to be editable?',
    choices: ['Yes', 'No'],
    filter: function(val) {
      if (val === "Yes") {
        return true;
      } else {
        return false;
      }
    }
  },
  {
    type: 'input',
    name: 'paymentAmount',
    message: 'Payment Amount?',
    validate: function(value) {
      var valid = !isNaN(parseFloat(value));
      return valid || 'Please enter a number';
    },
    filter: Number
  },
  {
    type: 'input',
    name: 'merchantName',
    message: 'What\'s the Merchant Name? (Optional)',
  },
  {
    type: 'input',
    name: 'additionalComments',
    message: 'Remarks',
  }
]

inquirer.prompt(questions)
  .then(answers => {
    if (answers.proxyType === "mobile") {
      answers.proxyNumber = "+65" + answers.proxyNumber
    }

    return generateString(answers.proxyType,
      answers.proxyNumber,
      answers.edit,
      answers.paymentAmount.toString(),
      answers.merchantName,
      answers.additionalComments)
  })
  .then(interimString => {
    var crcInterim = crc.compute(Buffer.from(interimString, "ascii"))
    var crcFinal = crcInterim.toString(16)
    crcFinal = "0000".substr(0, 4 - crcFinal.length) + crcFinal;
    console.log(crcFinal);
    var completeString = interimString + crcFinal.toUpperCase();
    console.log(completeString);

    QRCode.toFile('./QR-Output/test.png', completeString, {
      color: {
        dark: '#7C1A78',
        light: '#0000'
      }
    }, function(err) {
      if (err) throw err
    })
  })

//Payload (Mobile)
var payloadMobile = {
  preamble: "0002010102112650",
  globallyUniqueIdentifier: "0009SG.PAYNOW",
  proxyTypeCode: "01010",
  proxyValueCode: function(proxyValue) {
    if (proxyValue.length < 10) {
      var proxyOutput = "0" + proxyValue.length
    } else {
      var proxyOutput = proxyValue.length
    }
    return "02" + proxyOutput + proxyValue
  },
  transactionAmountEdit: editable => {
    if (editable) {
      return "03011";
    } else {
      return "03010";
    }
  },
  expiryDateCode: "",
  merchantCategoryCode: "52040000",
  transactionCurrency: "5303702",
  transactionAmount: price => {
    if (price.length < 10) {
      return "54" + "0" + price.length + price
    } else {
      return "54" + price.length + price
    }
  },
  countryCode: "5802SG",
  merchantNameCode: (merchantName) => {
    if (merchantName == "") {
      return "5902NA"
    } else if (merchantName.length >= 10) {
      return "59" + merchantName.length + merchantName
    } else {
      return "590" + merchantName.length + merchantName
    }
  },
  merchantCity: "6009Singapore",
  additionalComments: comment => {
    var subComment = ""
    if (comment == "") {
      return ""
    } else if (comment.length >= 10) {
      subComment = "01" + comment.length + comment
    } else {
      subComment = "010" + comment.length + comment
    }

    if (subComment.length >= 10) {
      return "62" + subComment.length + subComment
    } else {
      return "620" + subComment.length + subComment
    }
  },
  checksumCode: "6304"
};

//Payload (UEN)
var payloadUen = {
  preamble: "0002010102122637",
  globallyUniqueIdentifier: "0009SG.PAYNOW",
  proxyTypeCode: "01012",
  proxyValueCode: (proxyValue) => {
    if (proxyValue.length < 10) {
      var proxyOutput = "0" + proxyValue.length
    } else {
      var proxyOutput = proxyValue.length
    }
    return "02" + proxyOutput + proxyValue
  },
  transactionAmountEdit: (editable) => {
    if (editable) {
      return "03011";
    } else {
      return "03010";
    }
  },
  expiryDateCode: "",
  merchantCategoryCode: "52040000",
  transactionCurrency: "5303702",
  transactionAmount: (price) => {
    if (price.length < 10) {
      return "540" + price.length + price
    } else {
      return "54" + price.length + price
    }
  },
  countryCode: "5802SG",
  merchantNameCode: (merchantName) => {
    if (merchantName == "") {
      return "5902NA"
    } else if (merchantName.length >= 10) {
      return "59" + merchantName.length + merchantName
    } else {
      return "590" + merchantName.length + merchantName
    }
  },
  merchantCity: "6009Singapore",
  additionalComments: (comment) => {
    var subComment = ""
    if (comment == "") {
      return ""
    } else if (comment.length >= 10) {
      subComment = "01" + comment.length + comment
    } else {
      subComment = "010" + comment.length + comment
    }

    if (subComment.length >= 10) {
      return "62" + subComment.length + subComment
    } else {
      return "620" + subComment.length + subComment
    }
  },
  checksumCode: "6304"
};

//need to calculate CRC, check page 26 of EMVCO specifications
function generateString(proxyType, proxyValue, edit, price, merchantName, 
additionalComments) {
    
  if(proxyType === "mobile") {
      return payloadMobile.preamble +
        payloadMobile.globallyUniqueIdentifier +
        payloadMobile.proxyTypeCode +
        payloadMobile.proxyValueCode(proxyValue) +
        payloadMobile.transactionAmountEdit(edit) +
        payloadMobile.expiryDateCode +
        payloadMobile.merchantCategoryCode +
        payloadMobile.transactionCurrency +
        payloadMobile.transactionAmount(price) +
        payloadMobile.countryCode +
        payloadMobile.merchantNameCode(merchantName) +
        payloadMobile.merchantCity +
        payloadMobile.additionalComments(additionalComments) +
        payloadMobile.checksumCode
  } else {
      return payloadUen.preamble +
        payloadUen.globallyUniqueIdentifier +
        payloadUen.proxyTypeCode +
        payloadUen.proxyValueCode(proxyValue) +
        payloadUen.transactionAmountEdit(edit) +
        payloadUen.expiryDateCode +
        payloadUen.merchantCategoryCode +
        payloadUen.transactionCurrency +
        payloadUen.transactionAmount(price) +
        payloadUen.countryCode +
        payloadUen.merchantNameCode(merchantName) +
        payloadUen.merchantCity +
        payloadUen.additionalComments(additionalComments) +
        payloadUen.checksumCode
  }
};
