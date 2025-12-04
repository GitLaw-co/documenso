Documenso E-Sign Transactional Emails

Description

We need new transactional emails for documenso e-sign feature.

Template List

This is the list according to Documenso codebase analysis, for @Enoch Kambale to review:

Core E-Signing Email Templates (8 templates)

Currently implemented in Documenso:

1. Document Invite — Document sent for signature

When: Document is sent to recipients for signing
Recipients: All document recipients (signers, approvers, viewers, CC recipients)
Purpose: Invitation to sign or review document with signing link

2. Document Recipient Signed — Signer signed document

When: A recipient completes signing
Recipients: Document owner and other recipients (not the one who signed)
Purpose: Notification that a recipient has signed

3. Document Completed — All parties signed (completion)

When: All recipients have signed the document
Recipients: Document owner and all recipients
Purpose: Notification that document is fully completed with download link

4. Document Pending — Document pending signatures

When: Document is waiting for others to sign (after you sign)
Recipients: The recipient who just signed
Purpose: Confirmation that your signature is complete, waiting for others

5. Document Rejected — Signer declined/rejected document

When: A recipient rejects the document
Recipients: Document owner and other recipients
Purpose: Notification that document was rejected with rejection reason

6. Document Rejection Confirmed — Rejection confirmed

When: Rejection is confirmed
Recipients: Recipient who rejected
Purpose: Confirmation that rejection was processed

7. Document Cancel — Document voided by owner

When: Document is cancelled by owner
Recipients: All recipients
Purpose: Notification that document has been cancelled/voided

8. Recipient Removed — Recipient removed

When: A recipient is removed from the document
Recipients: The removed recipient
Purpose: Notification that recipient was removed from document

Additional Templates (Not Core E-Signing)

• Self-signing notification — Edge case for self-signing scenarios
• Document deleted — Admin action notification
• Template-based document creation — Notification when document is created from template

Missing Templates (Not Currently Implemented)

To signers

• Reminder to sign (automated after X days)
Note: Reminder functionality exists but uses the same template as the initial invite
• Link expiring soon (if using expiring links)

To document owner

• Signer opened document (document view tracking)

To all parties

• Document expired (unsigned)
Note: Expiration logic exists but dedicated email template may be missing

To signers

• Document updated (if allowed mid-signing)
• New signer added to chain

Most Critical Templates

1. ✅ Document sent for signature — IMPLEMENTED
2. ⚠️ Reminder to sign — Uses same template as invite with "Reminder:" prefix, but could be separate template
3. ✅ All parties signed — IMPLEMENTED
4. ✅ Signer declined — IMPLEMENTED

Notes

• All templates support branding customization (logos, colors)
• All templates support custom message bodies
• Templates are internationalized (multi-language support)
• Email sending can be enabled/disabled per document
• Templates are responsive and work across email clients
