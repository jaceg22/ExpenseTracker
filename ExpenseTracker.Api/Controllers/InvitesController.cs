using System.Security.Claims;
using ExpenseTracker.Api.Data;
using ExpenseTracker.Api.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ExpenseTracker.Api.Controllers;

[ApiController]
[Route("api/invites")]
public class InvitesController : ControllerBase
{
    private readonly AppDbContext _db;

    public InvitesController(AppDbContext db)
    {
        _db = db;
    }

    private int CurrentUserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet("{code}")]
    [AllowAnonymous]
    public async Task<ActionResult<InvitePreviewResponse>> PreviewInvite(string code)
    {
        var group = await FindGroupByInviteCode(code);
        if (group is null) return NotFound("Invite link is invalid or expired.");

        var memberCount = await _db.GroupMembers.CountAsync(gm => gm.GroupId == group.Id);
        var creator = await _db.Users.FindAsync(group.CreatedByUserId);
        var invitedByName = creator?.Name ?? "A group member";

        return Ok(new InvitePreviewResponse(group.Id, group.Name, memberCount, invitedByName));
    }

    [HttpPost("{code}/join")]
    [Authorize]
    public async Task<ActionResult<GroupResponse>> JoinGroup(string code)
    {
        var group = await FindGroupByInviteCode(code);
        if (group is null) return NotFound("Invite link is invalid or expired.");

        var alreadyMember = await _db.GroupMembers
            .AnyAsync(gm => gm.GroupId == group.Id && gm.UserId == CurrentUserId);
        if (alreadyMember)
            return Ok(await BuildGroupResponse(group.Id));

        _db.GroupMembers.Add(new Models.GroupMember { GroupId = group.Id, UserId = CurrentUserId });
        await _db.SaveChangesAsync();

        return Ok(await BuildGroupResponse(group.Id));
    }

    private async Task<Models.Group?> FindGroupByInviteCode(string code)
    {
        if (string.IsNullOrWhiteSpace(code)) return null;

        var normalized = code.Trim().ToLowerInvariant();
        return await _db.Groups.FirstOrDefaultAsync(g => g.InviteCode == normalized);
    }

    private async Task<GroupResponse> BuildGroupResponse(int groupId)
    {
        var group = await _db.Groups.FindAsync(groupId);
        var members = await _db.GroupMembers
            .Where(gm => gm.GroupId == groupId)
            .Include(gm => gm.User)
            .Select(gm => new UserResponse(gm.User!.Id, gm.User.Name, gm.User.Email))
            .ToListAsync();

        return new GroupResponse(group!.Id, group.Name, group.CreatedByUserId, group.CreatedAt, members);
    }
}
