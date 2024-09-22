import React, { useContext, useEffect, useRef, useState } from "react";
import Logo from "./Logo";
import { UserContext } from "./UserContext";
import { uniqBy } from "lodash";
import axios from "axios";
import Contact from "./Contact";

export default function Chat() {
    const [ws, setWs] = useState(null);
    const [onlinePeople, setOnlinePeople] = useState({});
    const [offlinePeople, setOfflinePeople] = useState({});
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [newMessageText, setNewMessageText] = useState('');
    const [messages, setMessages] = useState([]);
    const { username, id, setId, setUsername } = useContext(UserContext);
    const divUnderMessages = useRef();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        connectToWs();
        return () => {
            if (ws) {
                ws.close();
            }
        };
    }, []);

    function connectToWs() {
        const ws = new WebSocket('ws://localhost:4040');
        setWs(ws);
        ws.addEventListener('message', handleMessage);
        ws.addEventListener('close', () => {
            setTimeout(() => {
                console.log('Disconnected. Trying to reconnect');
                connectToWs();
            }, 2000);
        });
    }

    function showOnLinePeople(peopleArray) {
        const people = {};
        peopleArray.forEach(({ userId, username }) => {
            people[userId] = username;
        });
        setOnlinePeople(people);
    }

    function handleMessage(ev) {
        const messageData = JSON.parse(ev.data);
        if ('online' in messageData) {
            showOnLinePeople(messageData.online);
        } else if ('text' in messageData) {
            setMessages(prev => ([...prev, { ...messageData }]));
        }
    }

    function logout() {
        axios.post('/logout').then(() => {
            setWs(null);
            setId(null);
            setUsername(null);
        }).catch(err => {
            console.error("Logout failed:", err);
        });
    }

    function sendMessage(ev, file = null) {
        if (ev) ev.preventDefault();
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            console.error("WebSocket is not connected");
            return;
        }
        ws.send(JSON.stringify({
            recipient: selectedUserId,
            text: newMessageText,
            file,
        }));
        if (file) {
            axios.get('/messages/' + selectedUserId).then(res => {
                setMessages(res.data);
            }).catch(err => {
                console.error("Failed to fetch messages:", err);
            });
        } else {
            setNewMessageText('');
            setMessages(prev => ([...prev, {
                text: newMessageText,
                sender: id,
                recipient: selectedUserId,
                _id: Date.now(),
            }]));
        }
    }

    function sendFile(ev) {
        const file = ev.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            sendMessage(null, {
                name: file.name,
                data: reader.result,
            });
        };
        reader.onerror = (error) => {
            console.error("File reading failed:", error);
        };
    }

    useEffect(() => {
        const div = divUnderMessages.current;
        if (div) {
            div.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
    }, [messages]);

    useEffect(() => {
        if (id) {
            axios.get('/people').then(res => {
                const offlinePeopleArr = res.data
                    .filter(p => p._id !== id)
                    .filter(p => !Object.keys(onlinePeople).includes(p._id));
                const offlinePeople = {};
                offlinePeopleArr.forEach(p => {
                    offlinePeople[p._id] = p;
                });
                setOfflinePeople(offlinePeople);
            }).catch(err => {
                console.error("Failed to fetch people:", err);
            });
        }
    }, [onlinePeople, id]);

    useEffect(() => {
        if (selectedUserId) {
            axios.get('/messages/' + selectedUserId).then(res => {
                setMessages(res.data);
            }).catch(err => {
                console.error("Failed to fetch messages:", err);
            });
        }
    }, [selectedUserId]);

    const onlinePeopleExclOurUser = { ...onlinePeople };
    delete onlinePeopleExclOurUser[id];

    const messagesWithoutDupes = uniqBy(messages, '_id');

    return (
        <div className="flex h-screen bg-gray-100">
            {/* Sidebar */}
            <div className={`bg-white w-full md:w-1/3 lg:w-1/4 flex flex-col ${isSidebarOpen ? 'block' : 'hidden'} md:block`}>
                <div className="flex-grow overflow-y-auto">
                    <Logo />
                    {Object.keys(onlinePeopleExclOurUser).map(userId => (
                        <Contact
                            key={userId}
                            id={userId}
                            online={true}
                            username={onlinePeopleExclOurUser[userId]}
                            onClick={() => {setSelectedUserId(userId); setIsSidebarOpen(false);}}
                            selected={userId === selectedUserId} />
                    ))}
                    {Object.keys(offlinePeople).map(userId => (
                        <Contact
                            key={userId}
                            id={userId}
                            online={false}
                            username={offlinePeople[userId].username}
                            onClick={() => {setSelectedUserId(userId); setIsSidebarOpen(false);}}
                            selected={userId === selectedUserId} />
                    ))}
                </div>
                <div className="p-2 text-center flex items-center justify-center">
                    <span className="mr-2 text-sm text-gray-600 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 mr-1">
                            <path fillRule="evenodd" d="M18.685 19.097A9.723 9.723 0 0 0 21.75 12c0-5.385-4.365-9.75-9.75-9.75S2.25 6.615 2.25 12a9.723 9.723 0 0 0 3.065 7.097A9.716 9.716 0 0 0 12 21.75a9.716 9.716 0 0 0 6.685-2.653Zm-12.54-1.285A7.486 7.486 0 0 1 12 15a7.486 7.486 0 0 1 5.855 2.812A8.224 8.224 0 0 1 12 20.25a8.224 8.224 0 0 1-5.855-2.438ZM15.75 9a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" clipRule="evenodd" />
                        </svg>
                        {username}
                    </span>
                    <button
                        className="text-sm bg-red-100 py-1 px-2 text-red-500 border rounded-md hover:bg-red-200 transition duration-200"
                        onClick={logout}>
                        Logout
                    </button>
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex flex-col bg-gray-100 w-full md:w-2/3 lg:w-3/4 p-2">
                {/* Mobile Header */}
                <div className="md:hidden flex justify-between items-center mb-2">
                    <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-blue-500">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                        </svg>
                    </button>
                    <h2 className="text-lg font-semibold text-gray-700">
                        {selectedUserId ? (onlinePeople[selectedUserId] || offlinePeople[selectedUserId]?.username) : 'Select a chat'}
                    </h2>
                </div>

                <div className="flex-grow">
                    {!selectedUserId && (
                        <div className="flex h-full flex-grow items-center justify-center">
                            <div className="text-gray-400">&larr; Select a person from the sidebar</div>
                        </div>
                    )}
                    {!!selectedUserId && (
                        <div className="relative h-full">
                            <div className="overflow-y-scroll absolute top-0 left-0 right-0 bottom-2">
                                <div className="p-2">
                                    {messagesWithoutDupes.map(message => (
                                        <div key={message._id} className={(message.sender === id ? 'text-right' : 'text-left')}>
                                            <div className={"text-left inline-block p-2 my-2 rounded-lg text-sm " + (message.sender === id ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800')}>
                                                {message.text}
                                                {message.file && (
                                                    <div className="mt-2">
                                                        <a target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 underline text-sm" href={axios.defaults.baseURL + '/uploads/' + message.file}>
                                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                                                <path fillRule="evenodd" d="M18.97 3.659a2.25 2.25 0 00-3.182 0l-10.94 10.94a3.75 3.75 0 105.304 5.303l7.693-7.693a.75.75 0 011.06 1.06l-7.693 7.693a5.25 5.25 0 11-7.424-7.424l10.939-10.94a3.75 3.75 0 115.303 5.304L9.097 18.835l-.008.008-.007.007-.002.002-.003.002A2.25 2.25 0 015.91 15.66l7.81-7.81a.75.75 0 011.061 1.06l-7.81 7.81a.75.75 0 001.054 1.068L18.97 6.84a2.25 2.25 0 000-3.182z" clipRule="evenodd" />
                                                            </svg>
                                                            {message.file}
                                                        </a>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div ref={divUnderMessages}></div>
                            </div>
                        </div>
                    )}
                </div>
                {!!selectedUserId && (
                    <form className="flex gap-2" onSubmit={sendMessage}>
                        <input type="text"
                            value={newMessageText}
                            onChange={ev => setNewMessageText(ev.target.value)}
                            placeholder="Type your message here"
                            className="bg-white flex-grow border p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300" />
                        <label className="bg-blue-100 p-2 text-blue-600 cursor-pointer rounded-md border border-blue-200 hover:bg-blue-200 transition duration-200">
                            <input type="file" className="hidden" onChange={sendFile} />
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
                            </svg>
                        </label>
                        <button type="submit" className="bg-blue-500 p-2 text-white rounded-md hover:bg-blue-600 transition duration-200">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                            </svg>
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}