
# Schema Gap Analysis — PeoplePay360
# Compare what the forms/code use vs what is in DB schema

FORMS = {
    "employees": {
        "fields_in_form": ["name", "email", "phone", "department", "position", "type", "status", "manager", "location", "scheduleId", "bank"],
        "db_columns": ["id", "name", "email", "phone", "department", "position", "type", "status", "manager", "location", "schedule_id", "bank", "created_at"],
        "MISSING_IN_DB": [],
        "MISSING_IN_FORM": [],
        "notes": "All form fields covered."
    },
    "contracts": {
        "fields_in_form": ["employeeId", "start", "end", "wage", "structureId", "scheduleId"],
        "db_columns": ["id", "employee_id", "start_date", "end_date", "wage", "structure_id", "schedule_id", "status", "created_at"],
        "MISSING_IN_DB": [],
        "notes": "All form fields covered. status is auto-managed."
    },
    "attendance": {
        "fields_in_form": ["employeeId", "date", "checkIn", "checkOut"],
        "db_columns": ["id", "employee_id", "date", "check_in", "check_out", "worked_hours", "edited", "created_at"],
        "MISSING_IN_DB": [],
        "notes": "worked_hours exists in DB but not synced from Workspace in store.ts"
    },
    "leaveTypes": {
        "fields_in_form": ["name", "unit", "requiresAllocation"],
        "db_columns": ["id", "name", "unit", "requires_allocation", "created_at"],
        "MISSING_IN_DB": ["approval (Manager/Officer/No Validation)", "payrollWorkEntry", "displayColor", "active"],
        "notes": "Excalidraw shows: Approval, Payroll/Work Entry type, Display Color, Active toggle — none in DB or form"
    },
    "leaveAllocations": {
        "fields_in_form": ["employeeId", "typeId", "amount", "start", "end"],
        "db_columns": ["id", "employee_id", "type_id", "amount", "start_date", "end_date", "status", "created_at"],
        "MISSING_IN_DB": ["approver", "description/validity label"],
        "notes": "approver field missing in DB and store (form shows Approver in wireframe)"
    },
    "leaveRequests": {
        "fields_in_form": ["employeeId", "typeId", "start", "end", "duration", "reason"],
        "db_columns": ["id", "employee_id", "type_id", "start_date", "end_date", "duration", "reason", "status", "approver", "created_at"],
        "MISSING_IN_DB": ["allocationId (FK to which allocation was consumed)"],
        "notes": "actions.ts sets r.allocationId but DB has no allocation_id column"
    },
    "schedules": {
        "fields_in_form": ["name", "days", "start", "end", "breakHours"],
        "db_columns": ["id", "name", "days", "start_time", "end_time", "break_hours", "created_at"],
        "MISSING_IN_DB": [],
        "notes": "Currently single global start/end per schedule. Excalidraw shows per-day rows but this is a UI enhancement, not a blocking schema gap."
    },
    "payruns": {
        "fields_in_form": ["period", "structureId", "employeeIds"],
        "db_columns": ["id", "name", "period", "structure_id", "status", "created_at"],
        "MISSING_IN_DB": ["paid_at (set in actions.ts when markPaid)", "employeeIds (handled via junction payrun_employees)"],
        "notes": "paid_at timestamp missing in DB. actions.ts sets run.paidAt but no DB column."
    },
    "payslips": {
        "fields_in_code": ["id", "payrunId", "employeeId", "period", "structureId", "contractId", "basic", "gross", "deductions", "net", "workedDays", "lines"],
        "db_columns": ["id", "payrun_id", "employee_id", "period", "structure_id", "contract_id", "basic", "gross", "deductions", "net", "worked_days", "lines", "created_at"],
        "MISSING_IN_DB": [],
        "notes": "Fully covered."
    },
    "users": {
        "fields_in_form": ["name", "email", "roleId", "employeeId", "password", "active"],
        "db_columns": ["id", "email", "name", "role_id", "employee_id", "password", "active", "created_at"],
        "MISSING_IN_DB": [],
        "notes": "Single role_id. Excalidraw shows multi-role checkboxes but current design uses single FK."
    },
    "salaryRules": {
        "fields_in_form": ["name", "code", "category", "sequence", "method", "base", "value", "expression"],
        "db_columns": ["id", "name", "code", "category", "sequence", "method", "base", "value", "expression", "created_at"],
        "MISSING_IN_DB": [],
        "notes": "Fully covered."
    },
    "salaryStructures": {
        "fields_in_form": ["name", "active", "ruleIds"],
        "db_columns": ["id", "name", "active", "created_at"],
        "MISSING_IN_DB": [],
        "notes": "ruleIds handled via junction table."
    }
}

print("=" * 60)
print("FIELDS MISSING IN DB SCHEMA:")
print("=" * 60)
for table, info in FORMS.items():
    missing = info.get("MISSING_IN_DB", [])
    if missing:
        print(f"\n[{table}]")
        for m in missing:
            print(f"  ❌ MISSING: {m}")
        print(f"  NOTE: {info['notes']}")
