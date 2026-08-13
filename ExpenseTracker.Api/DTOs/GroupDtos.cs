namespace ExpenseTracker.Api.DTOs;

public record CreateGroupRequest(string Name);
public record AddMemberRequest(int UserId);
public record EmailInviteRequest(string Email);
public record GroupResponse(int Id, string Name, int CreatedByUserId, DateTime CreatedAt, List<UserResponse> Members);
public record InviteLinkResponse(string InviteCode, string InvitePath);
public record EmailInviteResponse(string Email, string InviteCode, string InvitePath);
public record InvitePreviewResponse(int GroupId, string GroupName, int MemberCount, string InvitedByName);
public record BalanceResponse(int UserId, string Name, decimal NetBalance);
