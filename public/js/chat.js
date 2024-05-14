const socket = io()

//Elements
const $messageForm = document.querySelector('#userForm')
const $messageFormInput  = $messageForm.querySelector('input')
const $messageFormButton = $messageForm.querySelector('button')
const $sendLocationButton = document.getElementById("send-location")
const $messages = document.querySelector('#messages')

//Templates
const messageTemplate = document.querySelector('#message-template').innerHTML
const locationMessageTemplate = document.querySelector('#location-message-template').innerHTML
const sidebarTemplate = document.querySelector('#sidebar-template').innerHTML

//options
const {username, room} = Qs.parse(location.search, {ignoreQueryPrefix: true})

const autoscroll = () => { 
    //New message element
    const $newMessage = $messages.lastElementChild
    
// Height of the new message
const newMessageStyles = getComputedStyle($newMessage);
const newMessageMargin = parseInt(newMessageStyles.marginBottom);
const newMessageHeight = $newMessage.offsetHeight + newMessageMargin;


    //Visible Height
    const visibleHeight = $messages.offsetHeight

    //Height of messages container
    const containerHeight = $messages.scrollHeight

    //How far have i scrolled
    const scrollOffset = $messages.scrollTop + visibleHeight

    if(containerHeight -newMessageHeight <= scrollOffset){
        $messages.scrollTop = $messages.scrollHeight
    }

}

socket.on('message', (message) => {
     console.log(message)
     const html = Mustache.render(messageTemplate, {
        username: message.username,
        message: message.text,
        createdAt: moment(message.createdAt).format('h:mm a')
     })
     $messages.insertAdjacentHTML('beforeend', html)
     autoscroll()
})

socket.on('locationMessage', (message) => { 
    console.log('link: ', message)
    const html = Mustache.render(locationMessageTemplate, {
      username: message.username, 
      url: message.url,
      createdAt: moment(message.createdAt).format("h:mm a"),
    });
    $messages.insertAdjacentHTML('beforeend', html)
    autoscroll()
})

socket.on('roomData', ({room, users}) => {
    const html = Mustache.render(sidebarTemplate, {
        room,
        users
    })
    document.querySelector('#sidebar').innerHTML = html
})
 
$messageForm.addEventListener('submit', function(event) {
    event.preventDefault(); // Prevent form submission
    //disable
    $messageFormButton.setAttribute("disabled", "true");

    const message = document.getElementById('userInput').value;
    socket.emit('sendMessage', message, (err) => {
        //enable
        $messageFormButton.removeAttribute("disabled")
        $messageFormInput.value = ''
        $messageFormInput.focus()

        if(err){
            return console.log(err)
        }

        console.log('The message was sent.')
    })

  });

$sendLocationButton.addEventListener('click', ()=>{
    
    if(!navigator.geolocation){
        return alert('Geolocation is  not supported by your browser..')
    } 

    $sendLocationButton.setAttribute( "disabled" , "true");
    
    navigator.geolocation.getCurrentPosition((position)=>{
         socket.emit('sendLocation', {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
        }, () => {
            $sendLocationButton.removeAttribute("disabled");
            console.log('Location shared..')
        })
    })
})

socket.emit('join', {username, room},(error) =>{
 
     if(error){  

        location.href = '/'
        alert(error);
    }  
}) 