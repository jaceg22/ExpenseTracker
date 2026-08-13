using ExpenseTracker.Api.Data;
using ExpenseTracker.Api.DTOs;
using Microsoft.EntityFrameworkCore;

namespace ExpenseTracker.Api.Services;

// Positive balance = this person is owed money.
// Negative balance = this person owes money.
public class BalanceService
{
    private readonly AppDbContext _db;

    public BalanceService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<BalanceResponse>> GetGroupBalances(int groupId)
    {
        var members = await _db.GroupMembers
            .Where(gm => gm.GroupId == groupId)
            .Include(gm => gm.User)
            .ToListAsync();

        var balances = members.ToDictionary(m => m.UserId, m => 0m);

        var expenses = await _db.Expenses
            .Where(e => e.GroupId == groupId)
            .Include(e => e.Participants)
            .ToListAsync();

        foreach (var expense in expenses)
        {
            if (balances.ContainsKey(expense.PaidByUserId))
                balances[expense.PaidByUserId] += expense.Amount;

            foreach (var participant in expense.Participants)
            {
                if (balances.ContainsKey(participant.UserId))
                    balances[participant.UserId] -= participant.ShareAmount;
            }
        }

        var settlements = await _db.Settlements
            .Where(s => s.GroupId == groupId)
            .ToListAsync();

        foreach (var settlement in settlements)
        {
            if (balances.ContainsKey(settlement.FromUserId))
                balances[settlement.FromUserId] += settlement.Amount;
            if (balances.ContainsKey(settlement.ToUserId))
                balances[settlement.ToUserId] -= settlement.Amount;
        }

        return members.Select(m => new BalanceResponse(
            m.UserId,
            m.User!.Name,
            Math.Round(balances[m.UserId], 2)
        )).ToList();
    }
}
