// scripts/contacts.js
import { setupContactsPage } from './contactsCore.js';

document.addEventListener('DOMContentLoaded', () => {
  setupContactsPage({
    formId: 'addContactForm',
    inputId: 'contactId',
    messageId: 'message',
    currentUserDisplayId: 'currentUser',
    pendingListId: 'pendingList',
    receivedListId: 'receivedList',
    approvedListId: 'approvedList'
  });
});