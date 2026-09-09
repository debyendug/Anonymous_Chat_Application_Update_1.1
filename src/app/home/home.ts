import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

interface UserInfo {
  Name: string;
  PhoneNumber: string;
  DateOfBirth: string;
}

interface ChatApiResult {
  statusCode: string;
  result: {
    chatRoomUniqueID: string;
    chatRoomPhNo: string;
    chatRoomName: string;
    dateOfBirth: string;
  };
}

interface ChatMessage {
  type: string;
  user?: string;
  text?: string;
}

@Component({
  imports: [FormsModule],
  selector: 'app-home',
  styleUrl: './home.css',
  templateUrl: './home.html',
})

export class Home {
  constructor(private router: Router) { }
  private readonly apiUrl1 =
    'https://debyendu97.bsite.net/api/ChatRoomAPI/GetDetailsChatRoom';

  name: any;
  phoneNumber: any;
  chatRoomUniqueID!: string;
  chatRoomPhNo!: string;
  username: any;
  dob: any;
  showForm!: boolean;

  async onSubmit() {
    if (!this.name || !this.phoneNumber) {
      alert('Please enter your name and phone number.');
      return;
    }
    const loadingBar = document.getElementById('loadingBar') as HTMLElement | null;
    if (loadingBar) {
      loadingBar.style.display = 'block';
    }

    const userInf: UserInfo = {
      Name: this.name.trim(),
      PhoneNumber: this.phoneNumber.trim(),
      DateOfBirth: ''
    };

    console.log('Request:', JSON.stringify(userInf));

    try {
      const response = await fetch(this.apiUrl1, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userInf)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const result = await response.json() as ChatApiResult;
      console.log('API Response:', result);

      if (result.statusCode === '200') {
        this.chatRoomUniqueID = result.result.chatRoomUniqueID;
        this.chatRoomPhNo = result.result.chatRoomPhNo;
        this.name = result.result.chatRoomName;
        this.username = this.name;
        this.dob = result.result.dateOfBirth;

        console.log('Login successful:', this.chatRoomUniqueID, this.chatRoomPhNo, this.name);

        this.showForm = false;     
                 this.router.navigate(['/ChatAppNew'], {
    queryParams: { name: this.name, phone: this.phoneNumber, chatRoomUniqueID: this.chatRoomUniqueID,dob: this.dob }});  // Redirect to another page   


      } else {
        alert('Login failed. Please try again.');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Something went wrong. Please try again.');
    } finally {
      if (loadingBar) {
        loadingBar.style.display = 'none';

      }
    }
  }
}
