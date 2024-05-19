const users = []

//addUser, removeUser, getUser, getUserInRoom
const addUser = ({ id, username, room }) => {
  if (!username || !room) {
    return {
      error: "Username and room are required",
    };
  }

  // Clean the data
  username = username.trim().toLowerCase();
  room = room.trim().toLowerCase();
 
  console.log('username: ' + username)
  
  // Check for existing user
  const existingUser = users.find((user) => {
    return user.room === room && user.username === username;
  });

  // Validate the username
  if (existingUser) {
    return {
      error: "Username is already in use.",
    };
  }

  // Store user
  const user = { id, username, room };
  users.push(user);
  return user;
};

//removes the existing users if id is found
const removeUser = (id) => {
    const index = users.findIndex((user) => user.id === id)

    if(index !== -1){
        return users.splice(index, 1)[0]
    }
}

//find the index of the  user with given id
const getUser = (id) => {
    return users.find((user) => user.id === id)
}

const getUsersInRoom = (room) => {
    room = room.trim().toLowerCase()
    return users.filter((user) => {
        return user.room === room
    })
}

module.exports = {
    addUser,
    removeUser,
    getUser,
    getUsersInRoom
}




