using System.Security.Claims;
using ExpenseTracker.Api.Data;
using ExpenseTracker.Api.DTOs;
using ExpenseTracker.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ExpenseTracker.Api.Controllers;

[ApiController]
[Route("api/groups/{groupId}/expenses")]
[Authorize]
public class ExpensesController : ControllerBase
{
    private readonly AppDbContext _db;

    public ExpensesController(AppDbContext db)
    {
        _db = db;
    }

    private int CurrentUserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpPost]
    public async Task<ActionResult<ExpenseResponse>> CreateExpense(int groupId, CreateExpenseRequest request)
    {
        if (!await IsMember(groupId)) return Forbid();

        if (string.IsNullOrWhiteSpace(request.Description) || request.Amount <= 0)
            return BadRequest("Description and a positive amount are required.");

        var payerIsMember = await _db.GroupMembers.AnyAsync(gm => gm.GroupId == groupId && gm.UserId == request.PaidByUserId);
        if (!payerIsMember) return BadRequest("The payer must be a member of the group.");

        var validMemberIds = await _db.GroupMembers
            .Where(gm => gm.GroupId == groupId)
            .Select(gm => gm.UserId)
            .ToListAsync();

        // Default: split evenly among every group member if no participants are specified.
        var participantIds = request.ParticipantUserIds is { Count: > 0 }
            ? request.ParticipantUserIds
            : validMemberIds;

        if (participantIds.Any(pid => !validMemberIds.Contains(pid)))
            return BadRequest("All participants must be members of the group.");

        if (participantIds.Count == 0)
            return BadRequest("At least one participant is required.");

        var expense = new Expense
        {
            GroupId = groupId,
            Description = request.Description.Trim(),
            Amount = request.Amount,
            Category = request.Category,
            PaidByUserId = request.PaidByUserId,
            Date = DateTime.UtcNow
        };

        // Even split; any rounding remainder goes to the first participant so shares always sum to the total.
        var baseShare = Math.Round(request.Amount / participantIds.Count, 2);
        var remainder = Math.Round(request.Amount - baseShare * participantIds.Count, 2);

        for (int i = 0; i < participantIds.Count; i++)
        {
            var share = baseShare + (i == 0 ? remainder : 0);
            expense.Participants.Add(new ExpenseParticipant
            {
                UserId = participantIds[i],
                ShareAmount = share
            });
        }

        _db.Expenses.Add(expense);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetExpenses), new { groupId }, await ToResponse(expense.Id));
    }

    [HttpGet]
    public async Task<ActionResult<List<ExpenseResponse>>> GetExpenses(int groupId)
    {
        if (!await IsMember(groupId)) return Forbid();

        var expenseIds = await _db.Expenses
            .Where(e => e.GroupId == groupId)
            .OrderByDescending(e => e.Date)
            .Select(e => e.Id)
            .ToListAsync();

        var results = new List<ExpenseResponse>();
        foreach (var id in expenseIds)
            results.Add(await ToResponse(id));

        return Ok(results);
    }

    [HttpDelete("{expenseId}")]
    public async Task<IActionResult> DeleteExpense(int groupId, int expenseId)
    {
        if (!await IsMember(groupId)) return Forbid();

        var expense = await _db.Expenses.FirstOrDefaultAsync(e => e.Id == expenseId && e.GroupId == groupId);
        if (expense is null) return NotFound();

        _db.Expenses.Remove(expense);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    private async Task<bool> IsMember(int groupId)
    {
        return await _db.GroupMembers.AnyAsync(gm => gm.GroupId == groupId && gm.UserId == CurrentUserId);
    }

    private async Task<ExpenseResponse> ToResponse(int expenseId)
    {
        var expense = await _db.Expenses
            .Include(e => e.PaidBy)
            .Include(e => e.Participants).ThenInclude(p => p.User)
            .FirstAsync(e => e.Id == expenseId);

        return new ExpenseResponse(
            expense.Id,
            expense.Description,
            expense.Amount,
            expense.Category,
            expense.PaidByUserId,
            expense.PaidBy!.Name,
            expense.Date,
            expense.Participants.Select(p => new ExpenseParticipantResponse(p.UserId, p.User!.Name, p.ShareAmount)).ToList()
        );
    }
}
