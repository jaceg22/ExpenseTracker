namespace ExpenseTracker.Api.DTOs;

public record CreateExpenseRequest(string Description, decimal Amount, int PaidByUserId, string? Category, List<int>? ParticipantUserIds);
public record ExpenseResponse(int Id, string Description, decimal Amount, string? Category, int PaidByUserId, string PaidByName, DateTime Date, List<ExpenseParticipantResponse> Participants);
public record ExpenseParticipantResponse(int UserId, string Name, decimal ShareAmount);
public record CreateSettlementRequest(int FromUserId, int ToUserId, decimal Amount, string? Note);
public record SettlementResponse(int Id, int FromUserId, string FromUserName, int ToUserId, string ToUserName, decimal Amount, string? Note, DateTime Date);
