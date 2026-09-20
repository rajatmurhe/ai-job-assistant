from ai.matching.skill_matcher import match_skills, skill_present


def test_exact_skill_match():
    resume = [{"name": "Python"}]
    job = [{"name": "Python", "importance": "MANDATORY"}]
    result = match_skills(resume, job)
    assert len(result["matched"]) == 1
    assert len(result["missing"]) == 0


def test_case_insensitive_match():
    resume = [{"name": "python"}]
    job = [{"name": "PYTHON", "importance": "MANDATORY"}]
    result = match_skills(resume, job)
    assert len(result["matched"]) == 1


def test_alias_skill_match():
    resume = [{"name": "JS", "aliases": ["JavaScript"]}]
    job = [{"name": "JavaScript", "importance": "MANDATORY"}]
    result = match_skills(resume, job)
    assert len(result["matched"]) == 1


def test_no_match_returns_empty():
    resume = [{"name": "Woodworking"}]
    job = [{"name": "Python", "importance": "MANDATORY"}]
    result = match_skills(resume, job)
    assert len(result["matched"]) == 0
    assert len(result["missing"]) == 1


def test_skill_present_helper():
    resume = [{"name": "React", "aliases": ["ReactJS"]}]
    assert skill_present("react", resume) is True
    assert skill_present("ReactJS", resume) is True
    assert skill_present("Vue", resume) is False
