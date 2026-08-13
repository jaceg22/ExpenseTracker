using System.Security.Claims;
using ExpenseTracker.Api.Data;
using ExpenseTracker.Api.DTOs;
using ExpenseTracker.Api.Models;
using ExpenseTracker.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ExpenseTracker.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class GroupsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly BalanceService _balanceService;

    public GroupsController(AppDbContext db, BalanceService balanceService)
    {
        _db = db;
        _balanceService = balanceService;
    }

    private int CurrentUserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpPost]
    public async Task<ActionResult<GroupResponse>> CreateGroup(CreateGroupRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest("Group name is required.");

        var group = new Group
        {
            Name = request.Name.Trim(),
            CreatedByUserId = CurrentUserId,
            InviteCode = InviteCodeGenerator.Create()
        };
        _db.Groups.Add(group);
        await _db.SaveChangesAsync();

        // Creator automatically becomes a member.
        _db.GroupMembers.Add(new GroupMember { GroupId = group.Id, UserId = CurrentUserId });
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetGroup), new { id = group.Id }, await BuildGroupResponse(group.Id));
    }

    [HttpGet]
    public async Task<ActionResult<List<GroupResponse>>> GetMyGroups()
    {
        var groupIds = await _db.GroupMembers
            .Where(gm => gm.UserId == CurrentUserId)
            .Select(gm => gm.GroupId)
            .ToListAsync();

        var results = new List<GroupResponse>();
        foreach (var id in groupIds)
            results.Add(await BuildGroupResponse(id));

        return Ok(results);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<GroupResponse>> GetGroup(int id)
    {
        if (!await IsMember(id)) return Forbid();

        var group = await _db.Groups.FindAsync(id);
        if (group is null) return NotFound();

        return Ok(await BuildGroupResponse(id));
    }

    [HttpPost("{id}/members")]
    public async Task<ActionResult<GroupResponse>> AddMember(int id, AddMemberRequest request)
    {
        if (!await IsMember(id)) return Forbid();

        var group = await _db.Groups.FindAsync(id);
        if (group is null) return NotFound("Group not found.");

        var userExists = await _db.Users.AnyAsync(u => u.Id == request.UserId);
        if (!userExists) return NotFound("User not found.");

        var alreadyMember = await _db.GroupMembers
            .AnyAsync(gm => gm.GroupId == id && gm.UserId == request.UserId);
        if (alreadyMember) return Conflict("User is already a member of this group.");

        _db.GroupMembers.Add(new GroupMember { GroupId = id, UserId = request.UserId });
        await _db.SaveChangesAsync();

        return Ok(await BuildGroupResponse(id));
    }

    [HttpGet("{id}/invite-link")]
    public async Task<ActionResult<InviteLinkResponse>> GetInviteLink(int id)
    {
        if (!await IsMember(id)) return Forbid();

        var group = await _db.Groups.FindAsync(id);
        if (group is null) return NotFound();

        if (string.IsNullOrWhiteSpace(group.InviteCode))
        {
            group.InviteCode = InviteCodeGenerator.Create();
            await _db.SaveChangesAsync();
        }

        return Ok(new InviteLinkResponse(group.InviteCode, $"/join/{group.InviteCode}"));
    }

    [HttpPost("{id}/invites/email")]
    public async Task<ActionResult<EmailInviteResponse>> InviteByEmail(int id, EmailInviteRequest request)
    {
        if (!await IsMember(id)) return Forbid();

        var group = await _db.Groups.FindAsync(id);
        if (group is null) return NotFound();

        if (string.IsNullOrWhiteSpace(request.Email) || !request.Email.Contains('@'))
            return BadRequest("A valid email address is required.");

        if (string.IsNullOrWhiteSpace(group.InviteCode))
        {
            group.InviteCode = InviteCodeGenerator.Create();
            await _db.SaveChangesAsync();
        }

        var email = request.Email.Trim().ToLowerInvariant();

        var alreadyMember = await _db.GroupMembers
            .Include(gm => gm.User)
            .AnyAsync(gm => gm.GroupId == id && gm.User!.Email == email);
        if (alreadyMember) return Conflict("That person is already in the group.");

        _db.GroupInvites.Add(new GroupInvite
        {
            GroupId = id,
            Email = email,
            CreatedByUserId = CurrentUserId
        });
        await _db.SaveChangesAsync();

        return Ok(new EmailInviteResponse(email, group.InviteCode, $"/join/{group.InviteCode}"));
    }

    [HttpDelete("{id}/members/me")]
    public async Task<IActionResult> LeaveGroup(int id)
    {
        var membership = await _db.GroupMembers
            .FirstOrDefaultAsync(gm => gm.GroupId == id && gm.UserId == CurrentUserId);
        if (membership is null) return NotFound("You are not a member of this group.");

        _db.GroupMembers.Remove(membership);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    [HttpGet("{id}/balances")]
    public async Task<ActionResult<List<BalanceResponse>>> GetBalances(int id)
    {
        if (!await IsMember(id)) return Forbid();

        var group = await _db.Groups.FindAsync(id);
        if (group is null) return NotFound();

        return Ok(await _balanceService.GetGroupBalances(id));
    }

    private async Task<bool> IsMember(int groupId)
    {
        return await _db.GroupMembers.AnyAsync(gm => gm.GroupId == groupId && gm.UserId == CurrentUserId);
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
