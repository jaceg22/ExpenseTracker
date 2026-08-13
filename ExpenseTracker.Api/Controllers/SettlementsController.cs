using System.Security.Claims;
using ExpenseTracker.Api.Data;
using ExpenseTracker.Api.DTOs;
using ExpenseTracker.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ExpenseTracker.Api.Controllers;

[ApiController]
[Route("api/groups/{groupId}/settlements")]
[Authorize]
public class SettlementsController : ControllerBase
{
    private readonly AppDbContext _db;

    public SettlementsController(AppDbContext db)
    {
        _db = db;
    }

    private int CurrentUserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    // Records "FromUser paid ToUser $X" to settle up part of the balance.
    [HttpPost]
    public async Task<ActionResult<SettlementResponse>> CreateSettlement(int groupId, CreateSettlementRequest request)
    {
        if (!await IsMember(groupId)) return Forbid();

        if (request.Amount <= 0) return BadRequest("Amount must be positive.");
        if (request.FromUserId == request.ToUserId) return BadRequest("From and to users must differ.");

        var validMemberIds = await _db.GroupMembers
            .Where(gm => gm.GroupId == groupId)
            .Select(gm => gm.UserId)
            .ToListAsync();

        if (!validMemberIds.Contains(request.FromUserId) || !validMemberIds.Contains(request.ToUserId))
            return BadRequest("Both users must be members of the group.");

        var settlement = new Settlement
        {
            GroupId = groupId,
            FromUserId = request.FromUserId,
            ToUserId = request.ToUserId,
            Amount = request.Amount,
            Note = request.Note,
            Date = DateTime.UtcNow
        };

        _db.Settlements.Add(settlement);
        await _db.SaveChangesAsync();

        return Ok(await ToResponse(settlement.Id));
    }

    [HttpGet]
    public async Task<ActionResult<List<SettlementResponse>>> GetSettlements(int groupId)
    {
        if (!await IsMember(groupId)) return Forbid();

        var ids = await _db.Settlements
            .Where(s => s.GroupId == groupId)
            .OrderByDescending(s => s.Date)
            .Select(s => s.Id)
            .ToListAsync();

        var results = new List<SettlementResponse>();
        foreach (var id in ids)
            results.Add(await ToResponse(id));

        return Ok(results);
    }

    private async Task<bool> IsMember(int groupId)
    {
        return await _db.GroupMembers.AnyAsync(gm => gm.GroupId == groupId && gm.UserId == CurrentUserId);
    }

    private async Task<SettlementResponse> ToResponse(int id)
    {
        var s = await _db.Settlements
            .Include(x => x.FromUser)
            .Include(x => x.ToUser)
            .FirstAsync(x => x.Id == id);

        return new SettlementResponse(s.Id, s.FromUserId, s.FromUser!.Name, s.ToUserId, s.ToUser!.Name, s.Amount, s.Note, s.Date);
    }
}
