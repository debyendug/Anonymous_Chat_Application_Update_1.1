import { Component, OnDestroy, OnInit, ChangeDetectorRef  } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

interface User {
  id: string;
  name: string;
  phone?: string;
  avatar?: string;
}

interface ChatMessage {
  id: string;
  from: User;
  text: string;
  time: string;
  mine?: boolean;
}

@Component({
  selector: 'app-chat-app-new',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-app-new.html',
  styleUrl: './chat-app-new.css'
})
export class ChatAppNew implements OnInit, OnDestroy {

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) { }

  title = 'Anonymous Chat Room';

  // =========================================================
  // WEBSOCKET
  // =========================================================

  private socket?: WebSocket;

  connected = false;
  joined = false;

  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private typingTimer?: ReturnType<typeof setTimeout>;

  private intentionallyClosed = false;

  // =========================================================
  // UI
  // =========================================================

  showJoin = true;
  showMenu = false;
  showMore = false;
  showProfile = false;
  showNameEditor = false;
  showPhoneEditor = false;
  showOnline = false;

  activeMode: 'single' | 'group' = 'group';

  // =========================================================
  // USER
  // =========================================================

  joinName = '';

  currentUser: User = {
    id: '',
    name: ''
  };

  editName = '';
  editPhone = '';

  // =========================================================
  // CHAT
  // =========================================================

  messageText = '';

  messages: ChatMessage[] = [];

  onlineUsers: User[] = [];

  typingUsers = new Map<string, string>();


  // =========================================================
  // INIT
  // =========================================================

  ngOnInit(): void {

    console.log('[APP] ngOnInit');

    /*
     * IMPORTANT:
     * Do NOT call connect() here.
     *
     * First get the user information from query params.
     * Then join() will create ONE WebSocket connection.
     */

    this.route.queryParams.subscribe(params => {

      console.log('[ROUTE] Parameters:', params);

      const userID = params['chatRoomUniqueID'] || '';
      const phone = params['phone'] || '';
      const name = params['name'] || '';

      console.log('[ROUTE] Name:', name);
      console.log('[ROUTE] Phone:', phone);
      console.log('[ROUTE] UniqueID:', userID);
      console.log('[ROUTE] Dob:', params['dob']);

      this.currentUser = {
        id: userID,
        name: name,
        phone: phone,
        avatar: ''
      };

      this.joinName = name;

      /*
       * If we have a name, join the room.
       *
       * join() will call connect().
       */
      if (name.trim()) {

        this.join(name);

      } else {

        this.showJoin = true;

      }

    });
  }


  // =========================================================
  // DESTROY
  // =========================================================

  ngOnDestroy(): void {

    console.log('[APP] ngOnDestroy');

    this.intentionallyClosed = true;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
    }

    if (this.socket) {

      /*
       * Remove handlers before closing.
       * This prevents old socket callbacks from affecting
       * the component.
       */
      this.socket.onopen = null;
      this.socket.onmessage = null;
      this.socket.onerror = null;
      this.socket.onclose = null;

      this.socket.close();

      this.socket = undefined;
    }

    this.connected = false;
    this.joined = false;
  }


  // =========================================================
  // JOIN
  // =========================================================

  join(name = this.joinName): void {

    const cleanName = name.trim();

    if (!cleanName) {
      return;
    }

    console.log('[CHAT] Joining as:', cleanName);

    this.joinName = cleanName;

    localStorage.setItem('acr_name', cleanName);

    /*
     * Generate ID only if one doesn't already exist.
     */
    if (!this.currentUser.id) {

      this.currentUser.id =
        localStorage.getItem('userID') ||
        `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      localStorage.setItem(
        'userID',
        this.currentUser.id
      );
    }

    this.currentUser.name = cleanName;

    this.intentionallyClosed = false;

    this.showJoin = false;

    /*
     * IMPORTANT:
     * connect() will check whether a socket already exists.
     */
    this.connect();
  }


  // =========================================================
  // CONNECT WEBSOCKET
  // =========================================================

  private connect(): void {

    console.count('[WS] connect() called');


    /*
     * VERY IMPORTANT
     *
     * Check both OPEN and CONNECTING.
     *
     * Your old code checked only OPEN.
     *
     * That was allowing multiple WebSockets to be created
     * while the first one was still CONNECTING.
     */

    if (
      this.socket &&
      (
        this.socket.readyState === WebSocket.OPEN ||
        this.socket.readyState === WebSocket.CONNECTING
      )
    ) {

      console.log(
        '[WS] Existing socket already OPEN/CONNECTING.'
      );

      return;
    }


    /*
     * Clear any pending reconnect timer.
     */
    if (this.reconnectTimer) {

      clearTimeout(this.reconnectTimer);

      this.reconnectTimer = undefined;
    }


    console.count('[WS] NEW WebSocket CREATED');

    console.log(
      '[WS] Connecting to ws:newnodeserverjs-for-update1-1.onrender.com'
    );


    this.intentionallyClosed = false;


    const ws = new WebSocket('wss:newnodeserverjs-for-update-server.onrender.com');


    /*
     * Store this socket.
     */
    this.socket = ws;


    // =======================================================
    // OPEN
    // =======================================================

    ws.onopen = () => {

      /*
       * Ignore an old/stale socket.
       */
      if (this.socket !== ws) {
        console.log('[WS] Ignoring stale socket OPEN');
        return;
      }

      console.log('[WS] CONNECTED');

      this.connected = true;


      /*
       * Send JOIN only after the WebSocket is actually OPEN.
       */
      const joinData = {
        type: 'join',
        id: this.currentUser.id,
        name: this.currentUser.name,
        phone: this.currentUser.phone || '',
        avatar: this.currentUser.avatar || ''
      };


      console.log(
        '[WS] SENDING JOIN:',
        joinData
      );


      ws.send(
        JSON.stringify(joinData)
      );
    };


    // =======================================================
    // MESSAGE
    // =======================================================

    ws.onmessage = (event) => {

      /*
       * Ignore messages from an old socket.
       */
      if (this.socket !== ws) {
        console.log('[WS] Ignoring message from old socket');
        return;
      }


      console.log(
        '[WS] MESSAGE RECEIVED:',
        event.data
      );


      try {

        const data = JSON.parse(event.data);

        console.log(
          '[WS] PARSED:',
          data
        );


        this.handleServerMessage(data);

      } catch (error) {

        console.error(
          '[WS] Invalid JSON:',
          error
        );

      }
    };


    // =======================================================
    // ERROR
    // =======================================================

    ws.onerror = (error) => {

      /*
       * Ignore errors from old socket.
       */
      if (this.socket !== ws) {
        return;
      }

      console.error(
        '[WS] ERROR:',
        error
      );

      this.connected = false;
    };


    // =======================================================
    // CLOSE
    // =======================================================

    ws.onclose = (event) => {

      /*
       * Ignore close event from an old socket.
       */
      if (this.socket !== ws) {
        console.log('[WS] Old socket closed');
        return;
      }


      console.log(
        '[WS] DISCONNECTED',
        'Code:',
        event.code,
        'Reason:',
        event.reason
      );


      this.connected = false;

      this.socket = undefined;


      /*
       * Reconnect only when the user didn't intentionally
       * leave the chat.
       */
      if (
        !this.intentionallyClosed &&
        this.joined
      ) {

        console.log(
          '[WS] Reconnecting in 2 seconds...'
        );


        if (!this.reconnectTimer) {

          this.reconnectTimer =
            setTimeout(() => {

              this.reconnectTimer = undefined;

              this.connect();

            }, 2000);
        }
      }
    };
  }


  // =========================================================
  // SERVER MESSAGE HANDLER
  // =========================================================

  private handleServerMessage(data: any): void {

    if (!data || !data.type) {
      return;
    }


    switch (data.type) {


      // =====================================================
      // JOINED
      // =====================================================

      case 'joined':

        console.log(
          '[CHAT] JOINED:',
          data
        );


        this.joined = true;

        this.currentUser = data.user;

        this.onlineUsers = data.users || [];

        this.saveProfile();

        break;


      // =====================================================
      // ONLINE USERS
      // =====================================================

      case 'online_users':

       this.onlineUsers = data.users || [];

  this.currentUser =
    this.onlineUsers.find(
      (u: User) => u.id === this.currentUser.id
    ) || this.currentUser;

  this.cdr.detectChanges();

        break;


      // =====================================================
      // MESSAGE
      // =====================================================

      case 'message':

        
  console.log('[CHAT] NEW MESSAGE:', data);

  // Prevent duplicate messages
  if (
    data.id &&
    this.messages.some(
      message => message.id === data.id
    )
  ) {
    console.warn(
      '[CHAT] Duplicate message ignored:',
      data.id
    );

    break;
  }

  this.messages.push({
    id: data.id,
    from: data.from,
    text: data.text,
    time: data.time,
    mine: data.from?.id === this.currentUser.id
  });

  // ⭐ IMPORTANT
  // Force Angular to update the screen immediately
  this.cdr.detectChanges();

  this.scrollToBottom();

  break;


      // =====================================================
      // TYPING
      // =====================================================

      case 'typing':

         if (
    data.user &&
    data.user.id !== this.currentUser.id
  ) {

    if (data.isTyping) {

      this.typingUsers.set(
        data.user.id,
        data.user.name
      );

    } else {

      this.typingUsers.delete(
        data.user.id
      );
    }

    this.cdr.detectChanges();
  }

        break;


      // =====================================================
      // SYSTEM
      // =====================================================

      case 'system':

        console.log(
          '[CHAT] SYSTEM:',
          data
        );


        if (data.id) {

          if (
            this.messages.some(
              message => message.id === data.id
            )
          ) {
            break;
          }
        }


        if (data.user) {

          this.messages.push({

            id:
              data.id ||
              `system-${Date.now()}-${Math.random()}`,

            from: data.user,

            text: data.text || '',

            time: data.time || '',

            mine: false
          });

        }


        this.scrollToBottom();

        break;


      // =====================================================
      // PROFILE UPDATED
      // =====================================================

      case 'profile_updated':

        console.log(
          '[CHAT] PROFILE UPDATED:',
          data
        );


        this.currentUser = data.user;

        this.saveProfile();


        this.onlineUsers =
          this.onlineUsers.map(u =>
            u.id === this.currentUser.id
              ? this.currentUser
              : u
          );

        break;


      // =====================================================
      // UNKNOWN
      // =====================================================

      default:

        console.log(
          '[WS] Unknown message type:',
          data.type
        );

        break;
    }
  }


  // =========================================================
  // SEND MESSAGE
  // =========================================================

  sendMessage(): void {

    const text = this.messageText.trim();


    if (!text) {
      return;
    }


    if (
      !this.socket ||
      this.socket.readyState !== WebSocket.OPEN
    ) {

      console.warn(
        '[CHAT] WebSocket is not connected'
      );

      return;
    }


    console.log(
      '[CHAT] SENDING MESSAGE:',
      text
    );


    /*
     * IMPORTANT:
     *
     * DON'T push the message into this.messages here.
     *
     * The server should broadcast the message back.
     *
     * handleServerMessage() will add it once.
     *
     * This fixes:
     *
     * Local message
     * +
     * Server message
     * =
     * duplicate
     */

    this.send({
      type: 'message',
      text: text
    });


    /*
     * Clear textbox.
     */
    this.messageText = '';


    /*
     * Stop typing.
     */
    this.sendTyping(false);
  }


  // =========================================================
  // TYPING
  // =========================================================

  onTyping(): void {

    this.sendTyping(true);


    if (this.typingTimer) {

      clearTimeout(
        this.typingTimer
      );
    }


    this.typingTimer =
      setTimeout(() => {

        this.sendTyping(false);

      }, 1000);
  }


  private sendTyping(
    isTyping: boolean
  ): void {

    if (!this.connected) {
      return;
    }


    this.send({
      type: 'typing',
      isTyping: isTyping
    });
  }


  // =========================================================
  // SEND THROUGH WEBSOCKET
  // =========================================================

  private send(data: any): void {

    if (
      this.socket &&
      this.socket.readyState === WebSocket.OPEN
    ) {

      console.log(
        '[WS] SEND:',
        data
      );


      this.socket.send(
        JSON.stringify(data)
      );

    } else {

      console.warn(
        '[WS] Cannot send - socket not OPEN'
      );
    }
  }


  // =========================================================
  // TYPING TEXT
  // =========================================================

  get typingText(): string {

    const names =
      [...this.typingUsers.values()];


    if (!names.length) {
      return '';
    }


    if (names.length === 1) {

      return `${names[0]} is typing...`;
    }


    if (names.length === 2) {

      return `${names[0]} and ${names[1]} are typing...`;
    }


    return `${names[0]} and ${names.length - 1
      } others are typing...`;
  }


  // =========================================================
  // PROFILE
  // =========================================================

  openProfile(): void {

    this.showMenu = false;

    this.showProfile = true;

    this.editName =
      this.currentUser.name;

    this.editPhone =
      this.currentUser.phone || '';
  }


  updateName(): void {

    const value =
      this.editName.trim();


    if (!value) {
      return;
    }


    this.send({
      type: 'profile_update',
      name: value
    });


    this.showNameEditor = false;
  }


  updatePhone(): void {

    const phone =
      this.editPhone.trim();


    this.send({
      type: 'profile_update',
      phone: phone
    });


    localStorage.setItem(
      'acr_phone',
      phone
    );


    this.showPhoneEditor = false;
  }


  // =========================================================
  // AVATAR
  // =========================================================

  onAvatarSelected(event: Event): void {

    const input =
      event.target as HTMLInputElement;


    const file =
      input.files?.[0];


    if (!file) {
      return;
    }


    if (!file.type.startsWith('image/')) {
      return;
    }


    if (file.size > 1024 * 1024) {

      alert(
        'Please select an image smaller than 1 MB.'
      );

      return;
    }


    const reader =
      new FileReader();


    reader.onload = () => {

      const avatar =
        String(reader.result);


      localStorage.setItem(
        'acr_avatar',
        avatar
      );


      this.currentUser.avatar =
        avatar;


      this.send({
        type: 'profile_update',
        avatar: avatar
      });
    };


    reader.readAsDataURL(file);


    input.value = '';
  }


  deleteAvatar(): void {

    localStorage.removeItem(
      'acr_avatar'
    );


    this.currentUser.avatar = '';


    this.send({
      type: 'profile_delete_avatar'
    });
  }


  // =========================================================
  // SAVE PROFILE
  // =========================================================

  private saveProfile(): void {

    localStorage.setItem(
      'acr_name',
      this.currentUser.name
    );


    localStorage.setItem(
      'acr_phone',
      this.currentUser.phone || ''
    );


    if (this.currentUser.avatar) {

      localStorage.setItem(
        'acr_avatar',
        this.currentUser.avatar
      );
    }
  }


  // =========================================================
  // LEAVE CHAT
  // =========================================================

  leaveChat(): void {

    console.log(
      '[CHAT] Leaving chat'
    );


    this.intentionallyClosed = true;


    if (this.reconnectTimer) {

      clearTimeout(
        this.reconnectTimer
      );

      this.reconnectTimer = undefined;
    }


    /*
     * Tell server we are leaving.
     */
    this.send({
      type: 'leave'
    });


    /*
     * Close WebSocket.
     */
    if (this.socket) {

      this.socket.onclose = null;

      this.socket.close();

      this.socket = undefined;
    }


    this.joined = false;

    this.connected = false;


    this.showMenu = false;


    /*
     * Clear chat.
     */
    this.messages = [];

    this.onlineUsers = [];

    this.typingUsers.clear();


    this.router.navigate([
      '/home'
    ]);
  }


  // =========================================================
  // UI
  // =========================================================

  home(): void {

    this.showMore = false;

    this.showMenu = false;
  }


  toggleMenu(): void {

    this.showMenu =
      !this.showMenu;

    this.showMore = false;
  }


  toggleMore(): void {

    this.showMore =
      !this.showMore;
  }


  // =========================================================
  // INITIALS
  // =========================================================

  initials(
    name: string
  ): string {

    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(x => x[0])
      .join('')
      .toUpperCase() || '?';
  }


  // =========================================================
  // ONLINE
  // =========================================================

  isOnline(
    id: string
  ): boolean {

    return this.onlineUsers.some(
      u => u.id === id
    );
  }


  // =========================================================
  // TRACK BY
  // =========================================================

  trackById(
    _: number,
    item: { id: string }
  ): string {

    return item.id;
  }


  // =========================================================
  // SCROLL
  // =========================================================

  private scrollToBottom(): void {

    setTimeout(() => {

      const box =
        document.querySelector(
          '.messages'
        ) as HTMLElement | null;


      if (box) {

        box.scrollTop =
          box.scrollHeight;
      }

    });
  }
}
